import { Router } from 'express';
import { fetchAllLatestVersions, fetchLatestVersion } from '../services/version-fetcher';
import { getCustomers } from '../services/ninjaone';
import { compareVersions } from '../services/comparator';
import { sendNotifications, type UpdateNotification } from '../services/notifier';

const router = Router();

router.post('/check', async (req, res) => {
  try {
    const { product } = req.body as { product?: string };

    console.log(`[Check] Manual check triggered${product ? ` for ${product}` : ' for all products'}`);

    const versions = product
      ? [await fetchLatestVersion(product)]
      : await fetchAllLatestVersions();

    const customers = await getCustomers();

    const updates: UpdateNotification[] = [];

    for (const version of versions) {
      if (!version.latestVersion) continue;

      for (const customer of customers) {
        for (const device of customer.devices) {
          if (device.product !== version.product) continue;
          const comparison = compareVersions(device.currentVersion, version.latestVersion, device.product);
          updates.push({
            ...comparison,
            customer: customer.name,
            device: device.name,
          });
        }
      }
    }

    await sendNotifications(updates);

    res.json({ versions, updates });
  } catch (error) {
    console.error('[Check] Error:', error);
    res.status(500).json({ error: 'Check failed' });
  }
});

export default router;
