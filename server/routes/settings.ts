import { Router } from 'express';
import { getDb } from '../db';
import { config } from '../config';
import { isNinjaOneConfigured } from '../services/runtime-settings';

const router = Router();

router.get('/settings', (_req, res) => {
  const db = getDb();
  const settings: Record<string, string> = {
    webhookUrl: config.webhookUrl || '',
    slackWebhookUrl: config.slackWebhookUrl || '',
    ninjaoneApiUrl: config.ninjaone.apiUrl || '',
    ninjaoneApiKey: config.ninjaone.apiKey || '',
    ninjaoneClientId: config.ninjaone.clientId || '',
    ninjaoneClientSecret: config.ninjaone.clientSecret || '',
    unifiApiUrl: '',
    unifiApiKey: '',
    unifiClientId: '',
    unifiClientSecret: '',
    sophosApiUrl: '',
    sophosApiKey: '',
    sophosClientId: '',
    sophosClientSecret: '',
  };

  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  settings.mockMode = isNinjaOneConfigured() ? 'false' : 'true';
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
