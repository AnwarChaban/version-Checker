import { type UpdateStatus } from './comparator';
import { productNames } from './version-fetcher';
import { getSlackWebhookUrl, getWebhookUrl } from './runtime-settings';

export interface UpdateNotification {
  product: string;
  currentVersion: string;
  latestVersion: string;
  status: UpdateStatus;
  customer: string;
  device: string;
}

export async function sendNotifications(updates: UpdateNotification[]): Promise<void> {
  const actionable = updates.filter(u => u.status === 'update-available' || u.status === 'major-update');
  const webhookUrl = getWebhookUrl();
  const slackWebhookUrl = getSlackWebhookUrl();

  if (actionable.length === 0) {
    console.log('[Notifier] All versions up to date, no notifications needed');
    return;
  }

  // Console notification
  console.log('\n══════════════════════════════════════════');
  console.log('  VERSION UPDATES AVAILABLE');
  console.log('══════════════════════════════════════════');
  for (const update of actionable) {
    const icon = update.status === 'major-update' ? '🔴' : '🟠';
    const name = productNames[update.product] || update.product;
    console.log(`${icon} ${name} @ ${update.customer} (${update.device})`);
    console.log(`   ${update.currentVersion} → ${update.latestVersion}`);
  }
  console.log('══════════════════════════════════════════\n');

  // Webhook notification
  if (webhookUrl) {
    await sendWebhook(webhookUrl, actionable);
  }

  // Slack notification
  if (slackWebhookUrl) {
    await sendSlackNotification(slackWebhookUrl, actionable);
  }
}

async function sendWebhook(url: string, updates: UpdateNotification[]): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'version-updates-available',
        timestamp: new Date().toISOString(),
        updates: updates.map(u => ({
          product: productNames[u.product] || u.product,
          customer: u.customer,
          device: u.device,
          currentVersion: u.currentVersion,
          latestVersion: u.latestVersion,
          status: u.status,
        })),
      }),
    });
    console.log(`[Notifier] Webhook sent: ${res.status}`);
  } catch (error) {
    console.error('[Notifier] Webhook failed:', error);
  }
}

async function sendSlackNotification(slackWebhookUrl: string, updates: UpdateNotification[]): Promise<void> {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🔄 ${updates.length} Update(s) verfügbar` },
    },
    ...updates.map(u => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${productNames[u.product] || u.product}* @ ${u.customer}\n\`${u.currentVersion}\` → \`${u.latestVersion}\` ${u.status === 'major-update' ? '🔴 Major' : '🟠 Update'}`,
      },
    })),
  ];

  try {
    const res = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    console.log(`[Notifier] Slack notification sent: ${res.status}`);
  } catch (error) {
    console.error('[Notifier] Slack notification failed:', error);
  }
}
