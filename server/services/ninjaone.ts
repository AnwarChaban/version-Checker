import { config } from '../config';
import { getDb } from '../db';

export interface Customer {
  id: number;
  name: string;
  devices: Device[];
}

export interface Device {
  id: number;
  name: string;
  product: string;
  currentVersion: string;
  orgId?: number;
  ninjaDeviceId?: number;
}

interface SoftwareEntry {
  product: string;
  currentVersion: string;
}

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

function toCustomFieldMap(device: any): Record<string, string> {
  const customFields = device?.customFields;
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

function extractSoftwareEntries(device: any): SoftwareEntry[] {
  const entries: SoftwareEntry[] = [];
  const seen = new Set<string>();

  const pushEntry = (productRaw: string, versionRaw: string) => {
    const product = productRaw.trim();
    const currentVersion = versionRaw.trim();
    if (!product || !currentVersion) return;
    const key = `${product.toLowerCase()}::${currentVersion.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ product, currentVersion });
  };

  const directProduct = getCustomField(device, ['product', 'Product', 'produkt']);
  const directVersion = getCustomField(device, ['currentVersion', 'current_version', 'version', 'CurrentVersion']);
  pushEntry(directProduct, directVersion);

  const fieldMap = toCustomFieldMap(device);
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

async function fetchOrganizationDevices(apiUrl: string, orgId: number, token: string): Promise<any[]> {
  const endpoints = [
    `${apiUrl}/organization/${orgId}/devices`,
    `${apiUrl}/organization/${orgId}/devices`,
  ];

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
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

function saveCustomersToDb(customers: Customer[]): void {
  const db = getDb();

  const clearDevices = db.prepare('DELETE FROM mock_devices');
  const clearCustomers = db.prepare('DELETE FROM mock_customers');
  const insertCustomer = db.prepare('INSERT INTO mock_customers (id, name) VALUES (?, ?)');
  const insertDevice = db.prepare(
    'INSERT INTO mock_devices (customer_id, name, product, current_version, org_id, ninja_device_id) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    clearDevices.run();
    clearCustomers.run();

    for (const customer of customers) {
      insertCustomer.run(customer.id, customer.name);
      for (const device of customer.devices) {
        insertDevice.run(
          customer.id,
          device.name,
          device.product,
          device.currentVersion,
          device.orgId ?? null,
          device.ninjaDeviceId ?? null,
        );
      }
    }
  });

  transaction();
}

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken as string;
  }

  const { clientId, clientSecret } = config.ninjaone;

  if (!clientId || !clientSecret) {
    throw new Error('NinjaOne Client ID and Client Secret are required');
  }

  console.log('[NinjaOne] Requesting new access token...');

  const tokenUrl = 'https://eu.ninjarmm.com/ws/oauth/token';
  const response = await fetch(tokenUrl, {
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

async function fetchFromNinjaOne(): Promise<Customer[]> {
  const { apiUrl } = config.ninjaone;
  const token = await getAccessToken();

  const res = await fetch(`${apiUrl}/organizations`, {
    headers: {
      'Authorization': `Bearer ${token}`,
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
    const devices = await fetchOrganizationDevices(apiUrl, org.id, token);
    console.log(`[NinjaOne] Fetching devices for organization ${org.id} from NinjaOne API...`);
    const mappedDevices: Device[] = devices.flatMap((d: any) => {
      const rawId = Number(d.id);
      if (!Number.isFinite(rawId) || rawId <= 0) return [];
      const name = d.systemName || d.dnsName || `Device-${d.id}`;
      const softwareEntries = extractSoftwareEntries(d);
      if (softwareEntries.length === 0) {
        return [{
          id: rawId * 100 + 1,
          name,
          product: 'unknown',
          currentVersion: 'unknown',
          orgId: Number(org.id),
          ninjaDeviceId: rawId,
        }];
      }

      return softwareEntries.map((entry, index) => ({
        id: rawId * 100 + index + 1,
        name,
        product: entry.product,
        currentVersion: entry.currentVersion,
        orgId: Number(org.id),
        ninjaDeviceId: rawId,
      }));
    });

    customers.push({
      id: org.id,
      name: org.name,
      devices: mappedDevices,
    });
  }

  return customers;
}

function getMockData(): Customer[] {
  const db = getDb();
  const customers = db.prepare('SELECT * FROM mock_customers').all() as { id: number; name: string }[];

  return customers.map(c => {
    const devices = db.prepare('SELECT * FROM mock_devices WHERE customer_id = ?').all(c.id) as {
      id: number; name: string; product: string; current_version: string; org_id?: number | null; ninja_device_id?: number | null;
    }[];

    return {
      id: c.id,
      name: c.name,
      devices: devices.map(d => ({
        id: d.id,
        name: d.name,
        product: d.product,
        currentVersion: d.current_version,
        orgId: d.org_id ?? undefined,
        ninjaDeviceId: d.ninja_device_id ?? undefined,
      })),
    };
  });
}

export async function syncNinjaOneData(): Promise<{ customers: number; devices: number }> {
  if (!config.useNinjaOne) {
    return { customers: 0, devices: 0 };
  }

  const customers = await fetchFromNinjaOne();
  saveCustomersToDb(customers);

  const devices = customers.reduce((sum, customer) => sum + customer.devices.length, 0);
  return { customers: customers.length, devices };
}

export async function getCustomers(): Promise<Customer[]> {
  if (config.useNinjaOne) {
    return getMockData();
  }
  console.log('[NinjaOne] No API key configured, using mock data');
  return getMockData();
}

export function isUsingMockData(): boolean {
  return !config.useNinjaOne;
}
