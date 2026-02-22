import { Router } from 'express';
import { getDb } from '../db';
import { productNames } from '../services/version-fetcher';
import { syncNinjaOneData } from '../services/ninjaone';
import { isNinjaOneConfigured, isUnifiConfigured } from '../services/runtime-settings';
import { syncUnifiData } from '../services/unifi';

const router = Router();

// --- Scraper Products ---

router.get('/admin/scraper-products', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM scraper_products').all() as { product: string; active: number }[];
  const result = rows.map(r => ({
    product: r.product,
    name: productNames[r.product] || r.product,
    active: r.active === 1,
  }));
  res.json(result);
});

router.put('/admin/scraper-products/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { active } = req.body as { active: boolean };
  db.prepare('UPDATE scraper_products SET active = ? WHERE product = ?').run(active ? 1 : 0, id);
  res.json({ ok: true });
});

// --- Custom Products ---

router.get('/admin/custom-products', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM custom_products ORDER BY created_at DESC').all() as any[];
  const result = rows.map(r => ({
    id: r.id,
    name: r.name,
    latestVersion: r.latest_version,
    releaseUrl: r.release_url,
    active: r.active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  res.json(result);
});

router.post('/admin/custom-products', (req, res) => {
  const db = getDb();
  const { id, name, latestVersion, releaseUrl } = req.body as {
    id: string; name: string; latestVersion: string; releaseUrl?: string;
  };
  if (!id || !name || !latestVersion) {
    res.status(400).json({ error: 'id, name, and latestVersion are required' });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO custom_products (id, name, latest_version, release_url, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
  ).run(id, name, latestVersion, releaseUrl || '', now, now);
  res.json({ ok: true });
});

router.put('/admin/custom-products/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, latestVersion, releaseUrl, active } = req.body as {
    name?: string; latestVersion?: string; releaseUrl?: string; active?: boolean;
  };
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM custom_products WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Custom product not found' });
    return;
  }
  db.prepare(
    'UPDATE custom_products SET name = ?, latest_version = ?, release_url = ?, active = ?, updated_at = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    latestVersion ?? existing.latest_version,
    releaseUrl ?? existing.release_url,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    now,
    id
  );
  res.json({ ok: true });
});

router.delete('/admin/custom-products/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM custom_products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Mock Customers ---

router.get('/admin/customers', (_req, res) => {
  const db = getDb();
  const customers = db.prepare('SELECT * FROM mock_customers').all() as { id: number; name: string }[];
  const result = customers.map(c => {
    const devices = db.prepare('SELECT * FROM mock_devices WHERE customer_id = ?').all(c.id) as any[];
    return {
      id: c.id,
      name: c.name,
      devices: devices.map(d => ({
        id: d.id,
        name: d.name,
        product: d.product,
        currentVersion: d.current_version,
        orgId: d.org_id ?? undefined,
        ninjaDeviceId: d.ninja_device_id ?? undefined,
      })),
    };
  });
  res.json(result);
});

router.post('/admin/customers', (req, res) => {
  const db = getDb();
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const result = db.prepare('INSERT INTO mock_customers (name) VALUES (?)').run(name);
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.put('/admin/customers/:id', (req, res) => {
  const db = getDb();
  const { name } = req.body as { name: string };
  db.prepare('UPDATE mock_customers SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/customers/:id', (req, res) => {
  const db = getDb();
  // Devices cascade-deleted via FK
  db.prepare('DELETE FROM mock_customers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Mock Devices ---

router.post('/admin/customers/:id/devices', (req, res) => {
  const db = getDb();
  const customerId = req.params.id;
  const { name, product, currentVersion, orgId, ninjaDeviceId } = req.body as {
    name: string; product: string; currentVersion: string; orgId?: number; ninjaDeviceId?: number;
  };
  if (!name || !product || !currentVersion) {
    res.status(400).json({ error: 'name, product, and currentVersion are required' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO mock_devices (customer_id, name, product, current_version, org_id, ninja_device_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(customerId, name, product, currentVersion, orgId ?? null, ninjaDeviceId ?? null);
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.put('/admin/devices/:id', (req, res) => {
  const db = getDb();
  const { name, product, currentVersion } = req.body as {
    name?: string; product?: string; currentVersion?: string;
  };
  const existing = db.prepare('SELECT * FROM mock_devices WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }
  db.prepare(
    'UPDATE mock_devices SET name = ?, product = ?, current_version = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    product ?? existing.product,
    currentVersion ?? existing.current_version,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/admin/devices/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM mock_devices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/admin/ninjaone/sync', async (_req, res) => {
  if (!isNinjaOneConfigured()) {
    res.status(400).json({ error: 'NinjaOne is not configured' });
    return;
  }

  try {
    const result = await syncNinjaOneData();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/admin/unifi/sync', async (_req, res) => {
  if (!isUnifiConfigured()) {
    res.status(400).json({ error: 'UniFi is not configured' });
    return;
  }

  try {
    const result = await syncUnifiData();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/admin/unifi/mappings', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT m.id, m.match_text, m.customer_id, m.created_at, c.name AS customer_name
    FROM unifi_customer_mappings m
    JOIN mock_customers c ON c.id = m.customer_id
    ORDER BY m.match_text ASC
  `).all() as Array<{
    id: number;
    match_text: string;
    customer_id: number;
    customer_name: string;
    created_at: string;
  }>;

  res.json(rows.map(row => ({
    id: row.id,
    matchText: row.match_text,
    customerId: row.customer_id,
    customerName: row.customer_name,
    createdAt: row.created_at,
  })));
});

router.post('/admin/unifi/mappings', (req, res) => {
  const db = getDb();
  const { matchText, customerId } = req.body as { matchText?: string; customerId?: number };
  const normalizedMatchText = String(matchText || '').trim();

  if (!normalizedMatchText || !customerId) {
    res.status(400).json({ error: 'matchText und customerId sind erforderlich' });
    return;
  }

  const customer = db.prepare('SELECT id FROM mock_customers WHERE id = ?').get(customerId) as { id: number } | undefined;
  if (!customer) {
    res.status(404).json({ error: 'Kunde nicht gefunden' });
    return;
  }

  const now = new Date().toISOString();

  try {
    const result = db.prepare(
      'INSERT INTO unifi_customer_mappings (match_text, customer_id, created_at) VALUES (?, ?, ?)'
    ).run(normalizedMatchText, customerId, now);

    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    const message = (error as Error).message || '';
    if (message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Dieses Match-Muster existiert bereits' });
      return;
    }
    res.status(500).json({ error: 'Mapping konnte nicht gespeichert werden' });
  }
});

router.delete('/admin/unifi/mappings/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM unifi_customer_mappings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/admin/unifi/unmatched-hosts', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, host_id, host_name, reason, synced_at
    FROM unifi_unmatched_hosts
    ORDER BY host_name COLLATE NOCASE ASC
  `).all() as Array<{
    id: number;
    host_id: string | null;
    host_name: string;
    reason: string;
    synced_at: string;
  }>;

  res.json(rows.map(row => ({
    id: row.id,
    hostId: row.host_id,
    hostName: row.host_name,
    reason: row.reason,
    syncedAt: row.synced_at,
  })));
});

export default router;
