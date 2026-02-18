import { Router } from 'express';
import { getDb } from '../db';
import { productNames } from '../services/version-fetcher';
import { config } from '../config';
import { syncNinjaOneData } from '../services/ninjaone';

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
  if (!config.useNinjaOne) {
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

export default router;
