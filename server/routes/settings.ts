import { Router } from 'express';
import { getDb } from '../db';
import { isUsingMockData } from '../services/ninjaone';

const router = Router();

router.get('/settings', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  settings.mockMode = isUsingMockData() ? 'true' : 'false';
  res.json(settings);
});

router.put('/settings', (req, res) => {
  const db = getDb();
  const updates = req.body as Record<string, string>;

  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'mockMode') continue; // read-only
      stmt.run(key, value);
    }
  });
  transaction();

  res.json({ ok: true });
});

export default router;
