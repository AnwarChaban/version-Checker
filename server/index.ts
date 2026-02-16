import express from 'express';
import cors from 'cors';
import path from 'path';
import cron from 'node-cron';
import { config } from './config';
import { getDb } from './db';
import productsRouter from './routes/products';
import checksRouter from './routes/checks';
import settingsRouter from './routes/settings';
import { fetchAllLatestVersions } from './services/version-fetcher';
import { getCustomers } from './services/ninjaone';
import { compareVersions } from './services/comparator';
import { sendNotifications, type UpdateNotification } from './services/notifier';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', productsRouter);
app.use('/api', checksRouter);
app.use('/api', settingsRouter);

// Serve React frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Initialize DB
getDb();

// Scheduled version check
async function runScheduledCheck() {
  console.log(`[Scheduler] Running version check at ${new Date().toISOString()}`);
  try {
    const versions = await fetchAllLatestVersions();
    const customers = await getCustomers();

    const updates: UpdateNotification[] = [];

    for (const version of versions) {
      if (!version.latestVersion) continue;
      for (const customer of customers) {
        for (const device of customer.devices) {
          if (device.product !== version.product) continue;
          const comparison = compareVersions(device.currentVersion, version.latestVersion, device.product);
          updates.push({ ...comparison, customer: customer.name, device: device.name });
        }
      }
    }

    await sendNotifications(updates);
    console.log(`[Scheduler] Check complete. ${updates.length} device(s) checked.`);
  } catch (error) {
    console.error('[Scheduler] Check failed:', error);
  }
}

cron.schedule(config.checkCron, runScheduledCheck);
console.log(`[Scheduler] Cron scheduled: ${config.checkCron}`);

// Start server
app.listen(config.port, () => {
  console.log(`[Server] Version Checker running on http://localhost:${config.port}`);
  console.log(`[Server] NinjaOne: ${config.useNinjaOne ? 'API mode' : 'Mock mode (no API key)'}`);

  // Run initial check on startup
  console.log('[Scheduler] Running initial version check...');
  runScheduledCheck();
});
