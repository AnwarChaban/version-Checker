import { config } from '../config';
import { getDb } from '../db';

export type ConnectorType = 'ninjaone' | 'unifi' | 'sophos' | 'generic-http';

export interface ConnectorRecord {
  id: number;
  name: string;
  type: ConnectorType;
  baseUrl: string;
  tokenUrl: string;
  authMode: 'apiKey' | 'oauth2ClientCredentials';
  apiKey: string;
  clientId: string;
  clientSecret: string;
  active: boolean;
  productScope: string[];
  customerScopeMode: 'all' | 'manual';
  fieldMapping: Record<string, string>;
  uiColor: string;
  lastTestAt?: string;
  lastTestStatus?: string;
  lastTestMessage?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncMessage?: string;
  createdAt: string;
  updatedAt: string;
}

function getSetting(key: string): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value?.trim() ?? '';
}

function getSettingOrFallback(key: string, fallback = ''): string {
  const value = getSetting(key);
  return value || fallback;
}

function parseJsonObject(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, string>
      : {};
  } catch {
    return {};
  }
}

function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(v => String(v).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function mapConnectorRow(row: any): ConnectorRecord {
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    type: String(row.type || 'generic-http') as ConnectorType,
    baseUrl: String(row.base_url || ''),
    tokenUrl: String(row.token_url || ''),
    authMode: String(row.auth_mode || 'apiKey') as 'apiKey' | 'oauth2ClientCredentials',
    apiKey: String(row.api_key || ''),
    clientId: String(row.client_id || ''),
    clientSecret: String(row.client_secret || ''),
    active: Number(row.active) === 1,
    productScope: parseJsonStringArray(row.product_scope),
    customerScopeMode: String(row.customer_scope_mode || 'all') as 'all' | 'manual',
    fieldMapping: parseJsonObject(row.field_mapping_json),
    uiColor: String(row.ui_color || ''),
    lastTestAt: row.last_test_at ? String(row.last_test_at) : undefined,
    lastTestStatus: row.last_test_status ? String(row.last_test_status) : undefined,
    lastTestMessage: row.last_test_message ? String(row.last_test_message) : undefined,
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : undefined,
    lastSyncStatus: row.last_sync_status ? String(row.last_sync_status) : undefined,
    lastSyncMessage: row.last_sync_message ? String(row.last_sync_message) : undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export function getConnectors(): ConnectorRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM connectors ORDER BY created_at DESC').all() as any[];
  return rows.map(mapConnectorRow);
}

export function getConnectorById(id: number): ConnectorRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM connectors WHERE id = ?').get(id) as any;
  return row ? mapConnectorRow(row) : null;
}

export function getActiveConnectors(): ConnectorRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM connectors WHERE active = 1 ORDER BY updated_at DESC').all() as any[];
  return rows.map(mapConnectorRow);
}

export function getActiveConnectorByType(type: ConnectorType): ConnectorRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM connectors WHERE type = ? AND active = 1 ORDER BY updated_at DESC LIMIT 1').get(type) as any;
  return row ? mapConnectorRow(row) : null;
}

export interface NinjaOneRuntimeConfig {
  apiUrl: string;
  tokenUrl: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
}

export function getNinjaOneRuntimeConfig(connectorId?: number): NinjaOneRuntimeConfig {
  const connector = connectorId ? getConnectorById(connectorId) : getActiveConnectorByType('ninjaone');
  if (connector) {
    return {
      apiUrl: connector.baseUrl,
      tokenUrl: connector.tokenUrl,
      apiKey: connector.apiKey,
      clientId: connector.clientId,
      clientSecret: connector.clientSecret,
    };
  }

  return {
    apiUrl: getSettingOrFallback('ninjaoneApiUrl', config.ninjaone.apiUrl),
    tokenUrl: getSettingOrFallback('ninjaoneTokenUrl', process.env.NINJAONE_TOKEN_URL || ''),
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

export function isNinjaOneConnectorConfigured(connectorId: number): boolean {
  const runtime = getNinjaOneRuntimeConfig(connectorId);
  const hasApiUrl = !!runtime.apiUrl;
  const hasApiKey = !!runtime.apiKey;
  const hasOauth = !!runtime.clientId && !!runtime.clientSecret;
  return hasApiUrl && (hasApiKey || hasOauth);
}

export function getWebhookUrl(): string {
  return getSettingOrFallback('webhookUrl', config.webhookUrl);
}

export function getSlackWebhookUrl(): string {
  return getSettingOrFallback('slackWebhookUrl', config.slackWebhookUrl);
}
