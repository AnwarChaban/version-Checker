const BASE = '/api';

export interface DeviceStatus {
  id: number;
  name: string;
  currentVersion: string;
  status: 'up-to-date' | 'update-available' | 'major-update' | 'unknown';
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
