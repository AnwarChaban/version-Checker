import * as cheerio from 'cheerio';

export async function fetchProxmoxBackupVersion(): Promise<{ version: string; url: string }> {
  const url = 'https://www.proxmox.com/en/downloads';
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const text = $('body').text();
    const match = text.match(/Proxmox\s+Backup\s+Server\s+([\d.]+)/i);

    if (match) {
      return { version: match[1], url };
    }

    // Fallback: check apt repo
    const aptUrl = 'http://download.proxmox.com/debian/pbs/dists/bookworm/pbs-no-subscription/binary-amd64/Packages';
    try {
      const aptRes = await fetch(aptUrl);
      const aptText = await aptRes.text();
      const versions: string[] = [];
      const regex = /Package:\s*proxmox-backup-server[\s\S]*?Version:\s*([\d.]+(?:-\d+)?)/g;
      let m;
      while ((m = regex.exec(aptText)) !== null) {
        versions.push(m[1]);
      }
      if (versions.length > 0) {
        versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        return { version: versions[0], url: 'https://www.proxmox.com/en/downloads' };
      }
    } catch {
      // apt fallback failed
    }

    throw new Error('Could not parse Proxmox Backup Server version');
  } catch (error) {
    console.error('[Scraper] Proxmox Backup Server fetch failed:', error);
    throw error;
  }
}
