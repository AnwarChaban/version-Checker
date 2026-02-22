import { config } from '../config';
import { getDb } from '../db';

function getSetting(key: string): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value?.trim() ?? '';
}

function getSettingOrFallback(key: string, fallback = ''): string {
  const value = getSetting(key);
  return value || fallback;
}

export interface NinjaOneRuntimeConfig {
  apiUrl: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
}

export interface UnifiRuntimeConfig {
  hostsApiUrl: string;
  devicesApiUrl: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
}

export function getNinjaOneRuntimeConfig(): NinjaOneRuntimeConfig {
  return {
    apiUrl: getSettingOrFallback('ninjaoneApiUrl', config.ninjaone.apiUrl),
    apiKey: getSettingOrFallback('ninjaoneApiKey', config.ninjaone.apiKey),
    clientId: getSettingOrFallback('ninjaoneClientId', config.ninjaone.clientId),
    clientSecret: getSettingOrFallback('ninjaoneClientSecret', config.ninjaone.clientSecret),
  };
}

export function isNinjaOneConfigured(): boolean {
  const runtime = getNinjaOneRuntimeConfig();
  const hasApiUrl = !!runtime.apiUrl;
  const hasApiKey = !!runtime.apiKey;
  const hasOauth = !!runtime.clientId && !!runtime.clientSecret;
  return hasApiUrl && (hasApiKey || hasOauth);
}

export function getUnifiRuntimeConfig(): UnifiRuntimeConfig {
  return {
    hostsApiUrl: config.unifi.hostsApiUrl,
    devicesApiUrl: config.unifi.devicesApiUrl,
    apiKey: getSettingOrFallback('unifiApiKey', config.unifi.apiKey),
    clientId: getSettingOrFallback('unifiClientId', config.unifi.clientId),
    clientSecret: getSettingOrFallback('unifiClientSecret', config.unifi.clientSecret),
  };
}

export function isUnifiConfigured(): boolean {
  const runtime = getUnifiRuntimeConfig();
  return !!runtime.apiKey;
}

export function getWebhookUrl(): string {
  return getSettingOrFallback('webhookUrl', config.webhookUrl);
}

export function getSlackWebhookUrl(): string {
  return getSettingOrFallback('slackWebhookUrl', config.slackWebhookUrl);
}
