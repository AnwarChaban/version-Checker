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
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mock_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      product TEXT NOT NULL,
      current_version TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES mock_customers(id) ON DELETE CASCADE
    );
  `);
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
