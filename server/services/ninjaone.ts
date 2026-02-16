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
}

async function fetchFromNinjaOne(): Promise<Customer[]> {
  const { apiUrl, apiKey } = config.ninjaone;

  const res = await fetch(`${apiUrl}/v2/organizations`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`NinjaOne API error: ${res.status} ${res.statusText}`);
  }

  const orgs = await res.json() as any[];

  const customers: Customer[] = [];
  for (const org of orgs) {
    const devicesRes = await fetch(`${apiUrl}/v2/organization/${org.id}/devices`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!devicesRes.ok) continue;

    const devices = await devicesRes.json() as any[];
    const mappedDevices: Device[] = devices
      .filter((d: any) => d.customFields?.product && d.customFields?.currentVersion)
      .map((d: any) => ({
        id: d.id,
        name: d.systemName || d.dnsName || `Device-${d.id}`,
        product: d.customFields.product,
        currentVersion: d.customFields.currentVersion,
      }));

    if (mappedDevices.length > 0) {
      customers.push({
        id: org.id,
        name: org.name,
        devices: mappedDevices,
      });
    }
  }

  return customers;
}

function getMockData(): Customer[] {
  const db = getDb();
  const customers = db.prepare('SELECT * FROM mock_customers').all() as { id: number; name: string }[];

  return customers.map(c => {
    const devices = db.prepare('SELECT * FROM mock_devices WHERE customer_id = ?').all(c.id) as {
      id: number; name: string; product: string; current_version: string;
    }[];

    return {
      id: c.id,
      name: c.name,
      devices: devices.map(d => ({
        id: d.id,
        name: d.name,
        product: d.product,
        currentVersion: d.current_version,
      })),
    };
  });
}

export async function getCustomers(): Promise<Customer[]> {
  if (config.useNinjaOne) {
    console.log('[NinjaOne] Fetching real data from NinjaOne API...');
    return fetchFromNinjaOne();
  }
  console.log('[NinjaOne] No API key configured, using mock data');
  return getMockData();
}

export function isUsingMockData(): boolean {
  return !config.useNinjaOne;
}
