import { config } from '../config';
import { getDb } from '../db';
import {
  getActiveConnectorByType,
  getConnectors,
  getNinjaOneRuntimeConfig,
  isNinjaOneConfigured,
  isNinjaOneConnectorConfigured,
} from './runtime-settings';

export interface Customer {
  id: number;
  name: string;
  devices: Device[];
  sourceConnectorId?: number;
}

export interface Device {
  id: number;
  name: string;
  product: string;
  currentVersion: string;
  orgId?: number;
  ninjaDeviceId?: number;
  sourceConnectorId?: number;
}

interface SoftwareEntry {
  product: string;
  currentVersion: string;
}

const GLOBAL_IGNORED_VERSION_VALUES = new Set([
  'nicht installiert',
  'not installed',
  'nichtinstalliert',
  'n/a',
  'na',
  '-',
  'none',
  'uninstalliert',
  'nicht vorhanden',
]);

const PRODUCT_VERSION_FIELD_MAP: Record<string, string[]> = {
  'teamviewer': ['teamViewerVersion', 'teamviewerVersion', 'tvVersion'],
  'synology-dsm': ['NASversion', 'nasVersion', 'synologyVersion', 'dsmVersion'],
  'sophos-firewall': ['sophosVersion', 'sophosFirewallVersion'],
  'unifi-network': ['unifiVersion', 'unifiNetworkVersion'],
  'proxmox-ve': ['proxmoxVeVersion', 'proxmoxVersion'],
  'proxmox-backup': ['proxmoxBackupVersion', 'pbsVersion'],
};

function normalizeCustomFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function getCustomField(device: any, keys: string[]): string {
  const customFields = device?.customFields;

  if (customFields && typeof customFields === 'object' && !Array.isArray(customFields)) {
    for (const key of keys) {
      const value = normalizeCustomFieldValue(customFields[key]);
      if (value) return value;
    }
  }

  if (Array.isArray(customFields)) {
    for (const field of customFields) {
      const name = String(field?.name ?? field?.label ?? '').toLowerCase();
      if (!name) continue;
      for (const key of keys) {
        if (name === key.toLowerCase()) {
          const value = normalizeCustomFieldValue(field?.value);
          if (value) return value;
        }
      }
    }
  }

  return '';
}

function splitValueList(value: string): string[] {
  return value
    .split(/[\n,;|]/)
    .map(v => v.trim())
    .filter(Boolean);
}

function toCustomFieldMap(customFields: any): Record<string, string> {
  const result: Record<string, string> = {};

  if (customFields && typeof customFields === 'object' && !Array.isArray(customFields)) {
    for (const [key, value] of Object.entries(customFields)) {
      const normalized = normalizeCustomFieldValue(value);
      if (normalized) result[key.toLowerCase()] = normalized;
    }
  }

  if (Array.isArray(customFields)) {
    for (const field of customFields) {
      const name = String(field?.name ?? field?.label ?? '').toLowerCase().trim();
      if (!name) continue;
      const value = normalizeCustomFieldValue(field?.value);
      if (value) result[name] = value;
    }
  }

  return result;
}

function getFieldValue(fieldMap: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = fieldMap[alias.toLowerCase()];
    if (value) return value;
  }
  return '';
}

async function fetchDeviceCustomFieldMap(apiUrl: string, deviceId: number, authorizationHeader: string): Promise<Record<string, string>> {
  const endpoints = [
    `${apiUrl}/device/${deviceId}/custom-fields`,
  ];

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': authorizationHeader,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) continue;

    const payload = await res.json() as any;
    return toCustomFieldMap(payload?.results ?? payload?.customFields ?? payload);
  }

  return {};
}

function extractSoftwareEntries(device: any, fieldMap: Record<string, string>): SoftwareEntry[] {
  const entries: SoftwareEntry[] = [];
  const seen = new Set<string>();

  const pushEntry = (productRaw: string, versionRaw: string) => {
    const product = productRaw.trim();
    const currentVersion = versionRaw.trim();
    if (!product || !currentVersion) return;

    const normalizedVersion = currentVersion.toLowerCase().replace(/\s+/g, ' ').trim();
    if (GLOBAL_IGNORED_VERSION_VALUES.has(normalizedVersion)) {
      return;
    }

    const key = `${product.toLowerCase()}::${currentVersion.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ product, currentVersion });
  };

  const directProduct = getCustomField(device, ['product', 'Product', 'produkt']);
  const directVersion = getCustomField(device, ['currentVersion', 'current_version', 'version', 'CurrentVersion']);
  pushEntry(directProduct, directVersion);

  for (const [product, aliases] of Object.entries(PRODUCT_VERSION_FIELD_MAP)) {
    const version = getFieldValue(fieldMap, aliases);
    pushEntry(product, version);
  }

  const productsValue = fieldMap['products'] || fieldMap['software'] || fieldMap['installedsoftware'];
  const versionsValue = fieldMap['versions'] || fieldMap['softwareversions'] || fieldMap['installedsoftwareversions'];
  if (productsValue && versionsValue) {
    const products = splitValueList(productsValue);
    const versions = splitValueList(versionsValue);
    if (products.length === versions.length) {
      for (let i = 0; i < products.length; i++) {
        pushEntry(products[i], versions[i]);
      }
    }
  }

  for (const [key, value] of Object.entries(fieldMap)) {
    const productMatch = key.match(/^(product|software|produkt)(?:[_-]?(\d+))$/i);
    if (!productMatch) continue;
    const suffix = productMatch[2];
    if (!suffix) continue;
    const version =
      fieldMap[`currentversion_${suffix}`] ||
      fieldMap[`currentversion-${suffix}`] ||
      fieldMap[`current_version_${suffix}`] ||
      fieldMap[`current_version-${suffix}`] ||
      fieldMap[`version_${suffix}`] ||
      fieldMap[`version-${suffix}`];
    if (version) pushEntry(value, version);
  }

  return entries;
}

function getDevicesFromApiPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.devices)) return payload.devices;
  return [];
}

async function fetchOrganizationDevices(apiUrl: string, orgId: number, authorizationHeader: string): Promise<any[]> {
  const endpoints = [
    `${apiUrl}/organization/${orgId}/devices`,
  ];

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': authorizationHeader,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[NinjaOne] Device endpoint failed (${res.status}) for org ${orgId}: ${endpoint}`);
      continue;
    }

    const payload = await res.json() as any;
    return getDevicesFromApiPayload(payload);
  }

  return [];
}

function composeCustomerId(connectorId: number | null, orgId: number): number {
  if (!connectorId) return orgId;
  return connectorId * 1_000_000 + orgId;
}

function saveCustomersToDb(customers: Customer[], connectorId: number | null): void {
  const db = getDb();

  const clearScopedDevices = connectorId
    ? db.prepare('DELETE FROM mock_devices WHERE source_connector_id = ?')
    : db.prepare('DELETE FROM mock_devices WHERE source_connector_id IS NULL');
  const clearScopedCustomers = connectorId
    ? db.prepare('DELETE FROM mock_customers WHERE source_connector_id = ?')
    : db.prepare('DELETE FROM mock_customers WHERE source_connector_id IS NULL');
  const insertCustomer = db.prepare('INSERT INTO mock_customers (id, name, source_connector_id) VALUES (?, ?, ?)');
  const insertDevice = db.prepare(
    'INSERT INTO mock_devices (customer_id, name, product, current_version, org_id, ninja_device_id, source_connector_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    if (connectorId) {
      clearScopedDevices.run(connectorId);
      clearScopedCustomers.run(connectorId);
    } else {
      clearScopedDevices.run();
      clearScopedCustomers.run();
    }

    for (const customer of customers) {
      insertCustomer.run(customer.id, customer.name, connectorId ?? null);
      for (const device of customer.devices) {
        insertDevice.run(
          customer.id,
          device.name,
          device.product,
          device.currentVersion,
          device.orgId ?? null,
          device.ninjaDeviceId ?? null,
          connectorId ?? null,
        );
      }
    }
  });

  transaction();
}

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenCacheKey: string | null = null;

function getAuthBaseUrl(apiUrl: string): string {
  if (!apiUrl) return 'https://eu.ninjarmm.com';
  try {
    const normalized = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;
    const url = new URL(normalized);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'https://eu.ninjarmm.com';
  }
}

async function getAccessToken(apiUrl: string, tokenUrl: string, clientId: string, clientSecret: string): Promise<string> {
  const currentCacheKey = `${apiUrl}::${tokenUrl}::${clientId}`;

  if (tokenCacheKey !== currentCacheKey) {
    cachedToken = null;
    tokenExpiry = 0;
    tokenCacheKey = currentCacheKey;
  }

  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken as string;
  }

  if (!clientId || !clientSecret) {
    throw new Error('NinjaOne Client ID and Client Secret are required');
  }

  console.log('[NinjaOne] Requesting new access token...');

  const oauthTokenUrl = tokenUrl || `${getAuthBaseUrl(apiUrl)}/ws/oauth/token`;
  const response = await fetch(oauthTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'monitoring',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Set expiry to 5 minutes before actual expiry (usually 3600 seconds)
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  console.log('[NinjaOne] Access token obtained successfully');
  return cachedToken as string;
}

async function getAuthorizationHeader(apiUrl: string, tokenUrl: string, apiKey: string, clientId: string, clientSecret: string): Promise<string> {
  if (apiKey) {
    return `Bearer ${apiKey}`;
  }

  const token = await getAccessToken(apiUrl, tokenUrl, clientId, clientSecret);
  return `Bearer ${token}`;
}

async function fetchFromNinjaOne(connectorId: number | null): Promise<Customer[]> {
  const { apiUrl, tokenUrl, apiKey, clientId, clientSecret } = getNinjaOneRuntimeConfig(connectorId ?? undefined);
  const connector = connectorId
    ? getConnectors().find(c => c.id === connectorId && c.type === 'ninjaone') || null
    : null;
  const allowedProducts = connector
    ? new Set((connector.productScope || []).map(p => p.toLowerCase()))
    : new Set<string>();
  const hasProductScope = allowedProducts.size > 0;

  if (!apiUrl) {
    throw new Error('NinjaOne API URL is required');
  }

  const authorizationHeader = await getAuthorizationHeader(apiUrl, tokenUrl, apiKey, clientId, clientSecret);

  const res = await fetch(`${apiUrl}/organizations`, {
    headers: {
      'Authorization': authorizationHeader,
      'Accept': 'application/json',
    },
  });
   console.log('[NinjaOne] Fetching organizations from NinjaOne API...');

  if (!res.ok) {
    throw new Error(`NinjaOne API error: ${res.status} ${res.statusText}`);
  }

  const orgs = await res.json() as any[];

  const customers: Customer[] = [];
  for (const org of orgs) {
    const devices = await fetchOrganizationDevices(apiUrl, org.id, authorizationHeader);
    console.log(`[NinjaOne] Fetching devices for organization ${org.id} from NinjaOne API...`);
    const mappedDevices: Device[] = [];

    for (const d of devices) {
      const rawId = Number(d.id);
      if (!Number.isFinite(rawId) || rawId <= 0) continue;

      const customFieldMap = {
        ...toCustomFieldMap(d?.customFields),
        ...(await fetchDeviceCustomFieldMap(apiUrl, rawId, authorizationHeader)),
      };

      const name = d.systemName || d.dnsName || `Device-${d.id}`;
      const softwareEntries = extractSoftwareEntries(d, customFieldMap);
      if (softwareEntries.length === 0) {
        if (!hasProductScope) {
          mappedDevices.push({
            id: rawId * 100 + 1,
            name,
            product: 'unknown',
            currentVersion: 'unknown',
            orgId: Number(org.id),
            ninjaDeviceId: rawId,
            sourceConnectorId: connectorId ?? undefined,
          });
        }
        continue;
      }

      const scopedEntries = hasProductScope
        ? softwareEntries.filter(entry => allowedProducts.has(entry.product.toLowerCase()))
        : softwareEntries;

      mappedDevices.push(...scopedEntries.map((entry, index) => ({
        id: rawId * 100 + index + 1,
        name,
        product: entry.product,
        currentVersion: entry.currentVersion,
        orgId: Number(org.id),
        ninjaDeviceId: rawId,
        sourceConnectorId: connectorId ?? undefined,
      })));
    }

    if (hasProductScope && mappedDevices.length === 0) {
      continue;
    }

    customers.push({
      id: composeCustomerId(connectorId, Number(org.id)),
      name: org.name,
      devices: mappedDevices,
      sourceConnectorId: connectorId ?? undefined,
    });
  }

  return customers;
}

function getMockData(): Customer[] {
  const db = getDb();
  const connectors = getConnectors();
  const connectorMap = new Map(connectors.map(c => [c.id, c]));

  const manualScopeRows = db.prepare('SELECT connector_id, customer_id, enabled FROM connector_customer_scope').all() as Array<{
    connector_id: number;
    customer_id: number;
    enabled: number;
  }>;
  const manualScopeEnabled = new Set(
    manualScopeRows
      .filter(r => r.enabled === 1)
      .map(r => `${r.connector_id}:${r.customer_id}`)
  );

  const customers = db.prepare('SELECT * FROM mock_customers').all() as Array<{ id: number; name: string; source_connector_id?: number | null }>;
  const result: Customer[] = [];

  for (const c of customers) {
    const sourceConnectorId = c.source_connector_id ?? undefined;
    if (sourceConnectorId) {
      const connector = connectorMap.get(sourceConnectorId);
      if (!connector || !connector.active) continue;
      if (connector.customerScopeMode === 'manual' && !manualScopeEnabled.has(`${sourceConnectorId}:${c.id}`)) {
        continue;
      }
    }

    const devices = db.prepare('SELECT * FROM mock_devices WHERE customer_id = ?').all(c.id) as {
      id: number; name: string; product: string; current_version: string; org_id?: number | null; ninja_device_id?: number | null; source_connector_id?: number | null;
    }[];

    const connector = sourceConnectorId ? connectorMap.get(sourceConnectorId) : null;
    const hasProductScope = !!connector && connector.productScope.length > 0;
    const allowedProducts = hasProductScope
      ? new Set(connector.productScope.map(p => p.toLowerCase()))
      : new Set<string>();

    const scopedDevices = hasProductScope
      ? devices.filter(d => allowedProducts.has(d.product.toLowerCase()))
      : devices;

    if (scopedDevices.length === 0) continue;

    result.push({
      id: c.id,
      name: c.name,
      sourceConnectorId,
      devices: scopedDevices.map(d => ({
        id: d.id,
        name: d.name,
        product: d.product,
        currentVersion: d.current_version,
        orgId: d.org_id ?? undefined,
        ninjaDeviceId: d.ninja_device_id ?? undefined,
        sourceConnectorId: d.source_connector_id ?? undefined,
      })),
    });
  }

  return result;
}

export async function syncNinjaOneData(connectorId?: number): Promise<{ customers: number; devices: number }> {
  const targetConnectorId = connectorId ?? getActiveConnectorByType('ninjaone')?.id;

  if (targetConnectorId) {
    if (!isNinjaOneConnectorConfigured(targetConnectorId)) {
      return { customers: 0, devices: 0 };
    }
  } else if (!isNinjaOneConfigured()) {
    return { customers: 0, devices: 0 };
  }

  const customers = await fetchFromNinjaOne(targetConnectorId ?? null);
  saveCustomersToDb(customers, targetConnectorId ?? null);

  const devices = customers.reduce((sum, customer) => sum + customer.devices.length, 0);
  return { customers: customers.length, devices };
}

export async function getCustomers(): Promise<Customer[]> {
  if (isNinjaOneConfigured()) {
    return getMockData();
  }
  console.log('[NinjaOne] No API key configured, using mock data');
  return getMockData();
}

export function isUsingMockData(): boolean {
  return !isNinjaOneConfigured();
}
