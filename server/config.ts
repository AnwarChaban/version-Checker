import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  checkCron: process.env.CHECK_CRON || '0 */4 * * *',
  ninjaSyncCron: process.env.NINJA_SYNC_CRON || '0 2 * * *',

  ninjaone: {
    apiUrl: process.env.NINJAONE_API_URL || '',
    clientId: process.env.NINJAONE_CLIENT_ID || '',
    clientSecret: process.env.NINJAONE_CLIENT_SECRET || '',
    apiKey: process.env.NINJAONE_API_KEY || '',
  },

  webhookUrl: process.env.WEBHOOK_URL || '',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',

  get useNinjaOne(): boolean {
    return !!this.ninjaone.apiKey || (!!this.ninjaone.clientId && !!this.ninjaone.clientSecret);
  },
};
