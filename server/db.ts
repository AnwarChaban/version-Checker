import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'versions.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb();
    seedMockData();
  }
  return db;
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS version_cache (
      product TEXT PRIMARY KEY,
      latest_version TEXT NOT NULL,
      release_url TEXT,
      checked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS check_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT NOT NULL,
      version TEXT NOT NULL,
      checked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scraper_products (
      product TEXT PRIMARY KEY,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS custom_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      latest_version TEXT NOT NULL,
      release_url TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mock_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source_connector_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS mock_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      product TEXT NOT NULL,
      current_version TEXT NOT NULL,
      org_id INTEGER,
      ninja_device_id INTEGER,
      source_connector_id INTEGER,
      FOREIGN KEY (customer_id) REFERENCES mock_customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      base_url TEXT DEFAULT '',
      token_url TEXT DEFAULT '',
      auth_mode TEXT NOT NULL DEFAULT 'apiKey',
      api_key TEXT DEFAULT '',
      client_id TEXT DEFAULT '',
      client_secret TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      product_scope TEXT NOT NULL DEFAULT '[]',
      customer_scope_mode TEXT NOT NULL DEFAULT 'all',
      field_mapping_json TEXT NOT NULL DEFAULT '{}',
      ui_color TEXT DEFAULT '',
      last_test_at TEXT,
      last_test_status TEXT,
      last_test_message TEXT,
      last_sync_at TEXT,
      last_sync_status TEXT,
      last_sync_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connector_customer_scope (
      connector_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (connector_id, customer_id),
      FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES mock_customers(id) ON DELETE CASCADE
    );
  `);

  ensureMockDeviceColumns();
  ensureMockCustomerColumns();
  ensureConnectorColumns();
  backfillLegacyNinjaOneConnector();
}

function readSettingValue(key: string): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value?.trim() ?? '';
}

function backfillLegacyNinjaOneConnector() {
  const existing = db.prepare("SELECT COUNT(*) as cnt FROM connectors WHERE type = 'ninjaone'").get() as { cnt: number };
  if (existing.cnt > 0) {
    return;
  }

  const apiUrl = readSettingValue('ninjaoneApiUrl') || (process.env.NINJAONE_API_URL || '').trim();
  const tokenUrl = readSettingValue('ninjaoneTokenUrl') || (process.env.NINJAONE_TOKEN_URL || '').trim();
  const apiKey = readSettingValue('ninjaoneApiKey') || (process.env.NINJAONE_API_KEY || '').trim();
  const clientId = readSettingValue('ninjaoneClientId') || (process.env.NINJAONE_CLIENT_ID || '').trim();
  const clientSecret = readSettingValue('ninjaoneClientSecret') || (process.env.NINJAONE_CLIENT_SECRET || '').trim();

  const hasApiKey = !!apiKey;
  const hasOauth = !!clientId && !!clientSecret;
  if (!apiUrl || (!hasApiKey && !hasOauth)) {
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO connectors (
      name, type, base_url, token_url, auth_mode, api_key, client_id, client_secret,
      active, product_scope, customer_scope_mode, field_mapping_json, ui_color,
      last_test_at, last_test_status, last_test_message,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'NinjaOne (migrated)',
    'ninjaone',
    apiUrl,
    tokenUrl,
    hasApiKey ? 'apiKey' : 'oauth2ClientCredentials',
    apiKey,
    clientId,
    clientSecret,
    1,
    '[]',
    'all',
    '{}',
    '',
    now,
    'ok',
    'Migrated from legacy settings',
    now,
    now,
  );
}

function ensureMockCustomerColumns() {
  const columns = db.prepare('PRAGMA table_info(mock_customers)').all() as Array<{ name: string }>;
  const existing = new Set(columns.map(c => c.name));

  if (!existing.has('source_connector_id')) {
    db.exec('ALTER TABLE mock_customers ADD COLUMN source_connector_id INTEGER');
  }
}

function ensureMockDeviceColumns() {
  const columns = db.prepare('PRAGMA table_info(mock_devices)').all() as Array<{ name: string }>;
  const existing = new Set(columns.map(c => c.name));

  if (!existing.has('org_id')) {
    db.exec('ALTER TABLE mock_devices ADD COLUMN org_id INTEGER');
  }

  if (!existing.has('ninja_device_id')) {
    db.exec('ALTER TABLE mock_devices ADD COLUMN ninja_device_id INTEGER');
  }

  if (!existing.has('source_connector_id')) {
    db.exec('ALTER TABLE mock_devices ADD COLUMN source_connector_id INTEGER');
  }
}

function ensureConnectorColumns() {
  const columns = db.prepare('PRAGMA table_info(connectors)').all() as Array<{ name: string }>;
  const existing = new Set(columns.map(c => c.name));

  if (!existing.has('token_url')) {
    db.exec(`ALTER TABLE connectors ADD COLUMN token_url TEXT DEFAULT ''`);
  }
  if (!existing.has('product_scope')) {
    db.exec(`ALTER TABLE connectors ADD COLUMN product_scope TEXT NOT NULL DEFAULT '[]'`);
  }
  if (!existing.has('customer_scope_mode')) {
    db.exec(`ALTER TABLE connectors ADD COLUMN customer_scope_mode TEXT NOT NULL DEFAULT 'all'`);
  }
  if (!existing.has('field_mapping_json')) {
    db.exec(`ALTER TABLE connectors ADD COLUMN field_mapping_json TEXT NOT NULL DEFAULT '{}'`);
  }
  if (!existing.has('ui_color')) {
    db.exec(`ALTER TABLE connectors ADD COLUMN ui_color TEXT DEFAULT ''`);
  }
  if (!existing.has('last_test_at')) {
    db.exec('ALTER TABLE connectors ADD COLUMN last_test_at TEXT');
  }
  if (!existing.has('last_test_status')) {
    db.exec('ALTER TABLE connectors ADD COLUMN last_test_status TEXT');
  }
  if (!existing.has('last_test_message')) {
    db.exec('ALTER TABLE connectors ADD COLUMN last_test_message TEXT');
  }
  if (!existing.has('last_sync_at')) {
    db.exec('ALTER TABLE connectors ADD COLUMN last_sync_at TEXT');
  }
  if (!existing.has('last_sync_status')) {
    db.exec('ALTER TABLE connectors ADD COLUMN last_sync_status TEXT');
  }
  if (!existing.has('last_sync_message')) {
    db.exec('ALTER TABLE connectors ADD COLUMN last_sync_message TEXT');
  }
}

function seedMockData() {
  // Seed scraper products if empty
  const scraperCount = db.prepare('SELECT COUNT(*) as cnt FROM scraper_products').get() as { cnt: number };
  if (scraperCount.cnt === 0) {
    const scraperProducts = [
      'synology-dsm', 'sophos-firewall', 'unifi-network',
      'proxmox-ve', 'proxmox-backup', 'teamviewer',
    ];
    const insertScraper = db.prepare('INSERT INTO scraper_products (product, active) VALUES (?, 1)');
    for (const p of scraperProducts) {
      insertScraper.run(p);
    }
  }

  // Seed mock customers + devices if empty
  const customerCount = db.prepare('SELECT COUNT(*) as cnt FROM mock_customers').get() as { cnt: number };
  if (customerCount.cnt === 0) {
    const mockData = [
      {
        name: 'Mustermann GmbH',
        devices: [
          { name: 'NAS-01', product: 'synology-dsm', currentVersion: '7.1.1' },
          { name: 'FW-01', product: 'sophos-firewall', currentVersion: '19.5.3' },
          { name: 'UNIFI-01', product: 'unifi-network', currentVersion: '7.5.187' },
          { name: 'TV-01', product: 'teamviewer', currentVersion: '15.51.6' },
        ],
      },
      {
        name: 'TechStart AG',
        devices: [
          { name: 'PVE-01', product: 'proxmox-ve', currentVersion: '8.0.4' },
          { name: 'PBS-01', product: 'proxmox-backup', currentVersion: '3.0.2' },
          { name: 'NAS-02', product: 'synology-dsm', currentVersion: '7.2.0' },
        ],
      },
      {
        name: 'Kanzlei Weber',
        devices: [
          { name: 'FW-02', product: 'sophos-firewall', currentVersion: '19.0.1' },
          { name: 'UNIFI-02', product: 'unifi-network', currentVersion: '7.4.162' },
          { name: 'TV-02', product: 'teamviewer', currentVersion: '15.70.3' },
        ],
      },
      {
        name: 'Praxis Dr. Schmidt',
        devices: [
          { name: 'NAS-03', product: 'synology-dsm', currentVersion: '7.0.1' },
          { name: 'PVE-02', product: 'proxmox-ve', currentVersion: '7.4.3' },
          { name: 'TV-03', product: 'teamviewer', currentVersion: '15.74.6' },
        ],
      },
    ];

    const insertCustomer = db.prepare('INSERT INTO mock_customers (name) VALUES (?)');
    const insertDevice = db.prepare('INSERT INTO mock_devices (customer_id, name, product, current_version) VALUES (?, ?, ?, ?)');

    const seedTransaction = db.transaction(() => {
      for (const customer of mockData) {
        const result = insertCustomer.run(customer.name);
        const customerId = result.lastInsertRowid;
        for (const device of customer.devices) {
          insertDevice.run(customerId, device.name, device.product, device.currentVersion);
        }
      }
    });
    seedTransaction();
  }
}
