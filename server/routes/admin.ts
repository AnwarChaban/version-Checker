import { Router } from 'express';
import { getDb } from '../db';
import { productNames } from '../services/version-fetcher';
import { syncNinjaOneData } from '../services/ninjaone';
import {
  getConnectorById,
  getConnectors,
  isNinjaOneConfigured,
  isNinjaOneConnectorConfigured,
  type ConnectorType,
} from '../services/runtime-settings';

const router = Router();

function safeParseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(v => String(v).trim()).filter(Boolean);
}

function safeParseRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[String(key)] = String(val ?? '');
  }
  return result;
}

// --- Connectors ---

router.get('/admin/connectors', (_req, res) => {
  res.json(getConnectors());
});

router.post('/admin/connectors', (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();

  const {
    name,
    type,
    baseUrl,
    tokenUrl,
    authMode,
    apiKey,
    clientId,
    clientSecret,
    active,
    productScope,
    customerScopeMode,
    fieldMapping,
    uiColor,
  } = req.body as {
    name: string;
    type: ConnectorType;
    baseUrl?: string;
    tokenUrl?: string;
    authMode?: 'apiKey' | 'oauth2ClientCredentials';
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    active?: boolean;
    productScope?: string[];
    customerScopeMode?: 'all' | 'manual';
    fieldMapping?: Record<string, string>;
    uiColor?: string;
  };

  if (!name || !type) {
    res.status(400).json({ error: 'name and type are required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO connectors (
      name, type, base_url, token_url, auth_mode, api_key, client_id, client_secret,
      active, product_scope, customer_scope_mode, field_mapping_json, ui_color,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(name).trim(),
    String(type).trim(),
    String(baseUrl || '').trim(),
    String(tokenUrl || '').trim(),
    authMode === 'oauth2ClientCredentials' ? 'oauth2ClientCredentials' : 'apiKey',
    String(apiKey || '').trim(),
    String(clientId || '').trim(),
    String(clientSecret || '').trim(),
    active === false ? 0 : 1,
    JSON.stringify(safeParseStringArray(productScope)),
    customerScopeMode === 'manual' ? 'manual' : 'all',
    JSON.stringify(safeParseRecord(fieldMapping)),
    String(uiColor || '').trim(),
    now,
    now,
  );

  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

router.put('/admin/connectors/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM connectors WHERE id = ?').get(id) as any;

  if (!existing) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  const body = req.body as {
    name?: string;
    type?: ConnectorType;
    baseUrl?: string;
    tokenUrl?: string;
    authMode?: 'apiKey' | 'oauth2ClientCredentials';
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    active?: boolean;
    productScope?: string[];
    customerScopeMode?: 'all' | 'manual';
    fieldMapping?: Record<string, string>;
    uiColor?: string;
  };

  db.prepare(`
    UPDATE connectors SET
      name = ?,
      type = ?,
      base_url = ?,
      token_url = ?,
      auth_mode = ?,
      api_key = ?,
      client_id = ?,
      client_secret = ?,
      active = ?,
      product_scope = ?,
      customer_scope_mode = ?,
      field_mapping_json = ?,
      ui_color = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    body.name !== undefined ? String(body.name).trim() : existing.name,
    body.type !== undefined ? String(body.type).trim() : existing.type,
    body.baseUrl !== undefined ? String(body.baseUrl).trim() : existing.base_url,
    body.tokenUrl !== undefined ? String(body.tokenUrl).trim() : (existing.token_url || ''),
    body.authMode !== undefined && body.authMode === 'oauth2ClientCredentials' ? 'oauth2ClientCredentials' : (body.authMode !== undefined ? 'apiKey' : existing.auth_mode),
    body.apiKey !== undefined ? String(body.apiKey).trim() : existing.api_key,
    body.clientId !== undefined ? String(body.clientId).trim() : existing.client_id,
    body.clientSecret !== undefined ? String(body.clientSecret).trim() : existing.client_secret,
    body.active !== undefined ? (body.active ? 1 : 0) : existing.active,
    body.productScope !== undefined ? JSON.stringify(safeParseStringArray(body.productScope)) : existing.product_scope,
    body.customerScopeMode !== undefined ? (body.customerScopeMode === 'manual' ? 'manual' : 'all') : existing.customer_scope_mode,
    body.fieldMapping !== undefined ? JSON.stringify(safeParseRecord(body.fieldMapping)) : existing.field_mapping_json,
    body.uiColor !== undefined ? String(body.uiColor).trim() : (existing.ui_color || ''),
    now,
    id,
  );

  res.json({ ok: true });
});

router.delete('/admin/connectors/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM connectors WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/admin/connectors/:id/test', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const now = new Date().toISOString();

  const connector = db.prepare('SELECT * FROM connectors WHERE id = ?').get(id) as any;
  if (!connector) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  try {
    if (!String(connector.base_url || '').trim()) {
      throw new Error('baseUrl is required');
    }
    if (connector.auth_mode === 'oauth2ClientCredentials' && (!String(connector.client_id || '').trim() || !String(connector.client_secret || '').trim())) {
      throw new Error('clientId and clientSecret are required for OAuth2');
    }
    if (connector.auth_mode === 'apiKey' && !String(connector.api_key || '').trim()) {
      throw new Error('apiKey is required for API key auth mode');
    }

    db.prepare(
      'UPDATE connectors SET last_test_at = ?, last_test_status = ?, last_test_message = ?, updated_at = ? WHERE id = ?'
    ).run(now, 'ok', 'Connection settings are valid', now, id);

    res.json({ ok: true, message: 'Connection settings are valid' });
  } catch (error) {
    db.prepare(
      'UPDATE connectors SET last_test_at = ?, last_test_status = ?, last_test_message = ?, updated_at = ? WHERE id = ?'
    ).run(now, 'error', (error as Error).message, now, id);

    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/admin/connectors/:id/sync', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const now = new Date().toISOString();

  const connector = db.prepare('SELECT * FROM connectors WHERE id = ?').get(id) as any;
  if (!connector) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  if (connector.type !== 'ninjaone') {
    res.status(400).json({ error: `Sync for connector type '${connector.type}' is not implemented yet` });
    return;
  }

  if (!isNinjaOneConnectorConfigured(Number(id))) {
    res.status(400).json({ error: 'Connector is not fully configured' });
    return;
  }

  try {
    const result = await syncNinjaOneData(Number(id));
    db.prepare(
      'UPDATE connectors SET last_sync_at = ?, last_sync_status = ?, last_sync_message = ?, updated_at = ? WHERE id = ?'
    ).run(now, 'ok', `Synced ${result.customers} customers and ${result.devices} devices`, now, id);
    res.json({ ok: true, ...result });
  } catch (error) {
    db.prepare(
      'UPDATE connectors SET last_sync_at = ?, last_sync_status = ?, last_sync_message = ?, updated_at = ? WHERE id = ?'
    ).run(now, 'error', (error as Error).message, now, id);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/admin/connectors/:id/customers', (req, res) => {
  const db = getDb();
  const connectorId = Number(req.params.id);
  const connector = getConnectorById(connectorId);

  if (!connector) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  const customers = db.prepare(
    'SELECT id, name FROM mock_customers WHERE source_connector_id = ? ORDER BY name ASC'
  ).all(connectorId) as Array<{ id: number; name: string }>;

  const scopedRows = db.prepare(
    'SELECT customer_id, enabled FROM connector_customer_scope WHERE connector_id = ?'
  ).all(connectorId) as Array<{ customer_id: number; enabled: number }>;
  const scopedMap = new Map(scopedRows.map(r => [r.customer_id, r.enabled === 1]));

  res.json({
    customerScopeMode: connector.customerScopeMode,
    customers: customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      enabled: connector.customerScopeMode === 'all'
        ? true
        : scopedMap.get(customer.id) === true,
    })),
  });
});

router.put('/admin/connectors/:id/customerscope', (req, res) => {
  const db = getDb();
  const connectorId = Number(req.params.id);
  const connector = getConnectorById(connectorId);

  if (!connector) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  const customerIds = safeParseStringArray((req.body as { customerIds?: unknown }).customerIds)
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0);

  const deleteScope = db.prepare('DELETE FROM connector_customer_scope WHERE connector_id = ?');
  const insertScope = db.prepare(
    'INSERT INTO connector_customer_scope (connector_id, customer_id, enabled) VALUES (?, ?, 1)'
  );

  const tx = db.transaction(() => {
    deleteScope.run(connectorId);
    for (const customerId of customerIds) {
      insertScope.run(connectorId, customerId);
    }
  });
  tx();

  res.json({ ok: true });
});

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

export default router;
