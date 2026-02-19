const BASE = '/api';

export interface DeviceStatus {
  id: number;
  name: string;
  currentVersion: string;
  status: 'up-to-date' | 'update-available' | 'major-update' | 'unknown';
  orgId?: number;
  ninjaDeviceId?: number;
}

export interface CustomerStatus {
  id: number;
  name: string;
  devices: DeviceStatus[];
}

export interface ProductStatus {
  product: string;
  productName: string;
  latestVersion: string;
  releaseUrl: string;
  checkedAt: string;
  error?: string;
  customers: CustomerStatus[];
}

export async function fetchProducts(): Promise<ProductStatus[]> {
  const res = await fetch(`${BASE}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function triggerCheck(product?: string): Promise<any> {
  const res = await fetch(`${BASE}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product ? { product } : {}),
  });
  if (!res.ok) throw new Error('Check failed');
  return res.json();
}

export async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

// --- Admin Types ---

export interface ScraperProduct {
  product: string;
  name: string;
  active: boolean;
}

export interface CustomProduct {
  id: string;
  name: string;
  latestVersion: string;
  releaseUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockDevice {
  id: number;
  name: string;
  product: string;
  currentVersion: string;
  orgId?: number;
  ninjaDeviceId?: number;
}

export interface MockCustomer {
  id: number;
  name: string;
  devices: MockDevice[];
}

export type ConnectorType = 'ninjaone' | 'unifi' | 'sophos' | 'generic-http';

export interface Connector {
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

// --- Admin: Scraper Products ---

export async function fetchScraperProducts(): Promise<ScraperProduct[]> {
  const res = await fetch(`${BASE}/admin/scraper-products`);
  if (!res.ok) throw new Error('Failed to fetch scraper products');
  return res.json();
}

export async function updateScraperProduct(id: string, active: boolean): Promise<void> {
  const res = await fetch(`${BASE}/admin/scraper-products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error('Failed to update scraper product');
}

// --- Admin: Custom Products ---

export async function fetchCustomProducts(): Promise<CustomProduct[]> {
  const res = await fetch(`${BASE}/admin/custom-products`);
  if (!res.ok) throw new Error('Failed to fetch custom products');
  return res.json();
}

export async function createCustomProduct(data: { id: string; name: string; latestVersion: string; releaseUrl?: string }): Promise<void> {
  const res = await fetch(`${BASE}/admin/custom-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create custom product');
}

export async function updateCustomProduct(id: string, data: { name?: string; latestVersion?: string; releaseUrl?: string; active?: boolean }): Promise<void> {
  const res = await fetch(`${BASE}/admin/custom-products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update custom product');
}

export async function deleteCustomProduct(id: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/custom-products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete custom product');
}

// --- Admin: Customers ---

export async function fetchCustomers(): Promise<MockCustomer[]> {
  const res = await fetch(`${BASE}/admin/customers`);
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function createCustomer(name: string): Promise<{ ok: boolean; id: number }> {
  const res = await fetch(`${BASE}/admin/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create customer');
  return res.json();
}

export async function updateCustomer(id: number, name: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to update customer');
}

export async function deleteCustomer(id: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/customers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete customer');
}

// --- Admin: Devices ---

export async function createDevice(customerId: number, data: {
  name: string;
  product: string;
  currentVersion: string;
  orgId?: number;
  ninjaDeviceId?: number;
}): Promise<{ ok: boolean; id: number }> {
  const res = await fetch(`${BASE}/admin/customers/${customerId}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create device');
  return res.json();
}

export async function triggerNinjaSync(): Promise<{ ok: boolean; customers: number; devices: number }> {
  const res = await fetch(`${BASE}/admin/ninjaone/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to sync NinjaOne data');
  return res.json();
}

export async function updateDevice(id: number, data: { name?: string; product?: string; currentVersion?: string }): Promise<void> {
  const res = await fetch(`${BASE}/admin/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update device');
}

export async function deleteDevice(id: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/devices/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete device');
}

// --- Admin: Connectors ---

export async function fetchConnectors(): Promise<Connector[]> {
  const res = await fetch(`${BASE}/admin/connectors`);
  if (!res.ok) throw new Error('Failed to fetch connectors');
  return res.json();
}

export async function createConnector(data: {
  name: string;
  type: ConnectorType;
  baseUrl: string;
  tokenUrl?: string;
  authMode: 'apiKey' | 'oauth2ClientCredentials';
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  active?: boolean;
  productScope?: string[];
  customerScopeMode?: 'all' | 'manual';
  fieldMapping?: Record<string, string>;
  uiColor?: string;
}): Promise<{ ok: boolean; id: number }> {
  const res = await fetch(`${BASE}/admin/connectors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create connector');
  return res.json();
}

export async function updateConnector(id: number, data: Partial<{
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
}>): Promise<void> {
  const res = await fetch(`${BASE}/admin/connectors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update connector');
}

export async function deleteConnector(id: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/connectors/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete connector');
}

export async function testConnector(id: number): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${BASE}/admin/connectors/${id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to test connector');
  return res.json();
}

export async function syncConnector(id: number): Promise<{ ok: boolean; customers?: number; devices?: number }> {
  const res = await fetch(`${BASE}/admin/connectors/${id}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to sync connector');
  return res.json();
}

export async function fetchConnectorCustomers(id: number): Promise<{
  customerScopeMode: 'all' | 'manual';
  customers: Array<{ id: number; name: string; enabled: boolean }>;
}> {
  const res = await fetch(`${BASE}/admin/connectors/${id}/customers`);
  if (!res.ok) throw new Error('Failed to fetch connector customers');
  return res.json();
}

export async function updateConnectorCustomerScope(id: number, customerIds: number[]): Promise<void> {
  const res = await fetch(`${BASE}/admin/connectors/${id}/customerscope`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerIds }),
  });
  if (!res.ok) throw new Error('Failed to update connector customer scope');
}

// --- Admin: Settings ---

export async function updateSettings(data: Record<string, string>): Promise<void> {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
}
