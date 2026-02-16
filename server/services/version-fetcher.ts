import { getDb } from '../db';
import { fetchSynologyVersion } from '../scrapers/synology';
import { fetchSophosVersion } from '../scrapers/sophos';
import { fetchUniFiVersion } from '../scrapers/unifi';
import { fetchProxmoxVEVersion } from '../scrapers/proxmox-ve';
import { fetchProxmoxBackupVersion } from '../scrapers/proxmox-backup';
import { fetchTeamViewerVersion } from '../scrapers/teamviewer';

export interface VersionInfo {
  product: string;
  latestVersion: string;
  releaseUrl: string;
  checkedAt: string;
  error?: string;
}

const scrapers: Record<string, () => Promise<{ version: string; url: string }>> = {
  'synology-dsm': fetchSynologyVersion,
  'sophos-firewall': fetchSophosVersion,
  'unifi-network': fetchUniFiVersion,
  'proxmox-ve': fetchProxmoxVEVersion,
  'proxmox-backup': fetchProxmoxBackupVersion,
  'teamviewer': fetchTeamViewerVersion,
};

export const productNames: Record<string, string> = {
  'synology-dsm': 'Synology DSM',
  'sophos-firewall': 'Sophos Firewall',
  'unifi-network': 'UniFi Network',
  'proxmox-ve': 'Proxmox VE',
  'proxmox-backup': 'Proxmox Backup Server',
  'teamviewer': 'TeamViewer',
};

export function getProductName(id: string): string {
  // Check scraper product names first
  if (productNames[id]) return productNames[id];
  // Check custom products
  const db = getDb();
  const custom = db.prepare('SELECT name FROM custom_products WHERE id = ?').get(id) as { name: string } | undefined;
  return custom?.name || id;
}

export async function fetchLatestVersion(product: string): Promise<VersionInfo> {
  const scraper = scrapers[product];
  if (!scraper) {
    // Check if it's a custom product
    const db = getDb();
    const custom = db.prepare('SELECT * FROM custom_products WHERE id = ? AND active = 1').get(product) as any;
    if (custom) {
      return {
        product,
        latestVersion: custom.latest_version,
        releaseUrl: custom.release_url || '',
        checkedAt: custom.updated_at,
      };
    }
    return {
      product,
      latestVersion: '',
      releaseUrl: '',
      checkedAt: new Date().toISOString(),
      error: `Unknown product: ${product}`,
    };
  }

  try {
    const { version, url } = await scraper();
    const checkedAt = new Date().toISOString();

    // Cache in DB
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO version_cache (product, latest_version, release_url, checked_at)
      VALUES (?, ?, ?, ?)
    `).run(product, version, url, checkedAt);

    db.prepare(`
      INSERT INTO check_history (product, version, checked_at)
      VALUES (?, ?, ?)
    `).run(product, version, checkedAt);

    return { product, latestVersion: version, releaseUrl: url, checkedAt };
  } catch (error) {
    // Try returning cached version
    const db = getDb();
    const cached = db.prepare('SELECT * FROM version_cache WHERE product = ?').get(product) as any;
    if (cached) {
      return {
        product,
        latestVersion: cached.latest_version,
        releaseUrl: cached.release_url,
        checkedAt: cached.checked_at,
        error: `Fetch failed, using cached data: ${(error as Error).message}`,
      };
    }
    return {
      product,
      latestVersion: '',
      releaseUrl: '',
      checkedAt: new Date().toISOString(),
      error: (error as Error).message,
    };
  }
}

export async function fetchAllLatestVersions(): Promise<VersionInfo[]> {
  const allProducts = getAllProducts();
  const results = await Promise.allSettled(
    allProducts.map(product => fetchLatestVersion(product))
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    const product = allProducts[i];
    return {
      product,
      latestVersion: '',
      releaseUrl: '',
      checkedAt: new Date().toISOString(),
      error: (result.reason as Error).message,
    };
  });
}

export function getCachedVersions(): VersionInfo[] {
  const db = getDb();

  // Get scraper cached versions
  const rows = db.prepare('SELECT * FROM version_cache').all() as any[];
  const scraperVersions = rows.map(row => ({
    product: row.product,
    latestVersion: row.latest_version,
    releaseUrl: row.release_url,
    checkedAt: row.checked_at,
  }));

  // Get active custom product versions
  const customRows = db.prepare('SELECT * FROM custom_products WHERE active = 1').all() as any[];
  const customVersions = customRows.map(row => ({
    product: row.id,
    latestVersion: row.latest_version,
    releaseUrl: row.release_url || '',
    checkedAt: row.updated_at,
  }));

  return [...scraperVersions, ...customVersions];
}

export function getAllProducts(): string[] {
  const db = getDb();

  // Active scraper products
  const activeScrapers = db.prepare('SELECT product FROM scraper_products WHERE active = 1').all() as { product: string }[];
  const scraperIds = activeScrapers.map(r => r.product).filter(p => scrapers[p]);

  // Active custom products
  const activeCustom = db.prepare('SELECT id FROM custom_products WHERE active = 1').all() as { id: string }[];
  const customIds = activeCustom.map(r => r.id);

  return [...scraperIds, ...customIds];
}
