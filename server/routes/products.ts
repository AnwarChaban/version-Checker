import { Router } from 'express';
import { getAllProducts, getCachedVersions, getProductName, type VersionInfo } from '../services/version-fetcher';
import { getCustomers } from '../services/ninjaone';
import { compareVersions, type ComparisonResult } from '../services/comparator';

const router = Router();

export interface ProductStatus {
  product: string;
  productName: string;
  latestVersion: string;
  releaseUrl: string;
  checkedAt: string;
  error?: string;
  customers: Array<{
    id: number;
    name: string;
    devices: Array<{
      id: number;
      name: string;
      currentVersion: string;
      status: ComparisonResult['status'];
    }>;
  }>;
}

router.get('/products', async (_req, res) => {
  try {
    const [cachedVersions, customers] = await Promise.all([
      getCachedVersions(),
      getCustomers(),
    ]);

    const versionMap = new Map<string, VersionInfo>();
    for (const v of cachedVersions) {
      versionMap.set(v.product, v);
    }

    const allProducts = getAllProducts();
    const result: ProductStatus[] = allProducts.map(product => {
      const cached = versionMap.get(product);
      const latestVersion = cached?.latestVersion || '';

      const productCustomers = customers
        .map(customer => {
          const devices = customer.devices
            .filter(d => d.product === product)
            .map(d => {
              const comparison = latestVersion
                ? compareVersions(d.currentVersion, latestVersion, product)
                : { status: 'unknown' as const };
              return {
                id: d.id,
                name: d.name,
                currentVersion: d.currentVersion,
                status: comparison.status,
              };
            });

          if (devices.length === 0) return null;
          return { id: customer.id, name: customer.name, devices };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      return {
        product,
        productName: getProductName(product),
        latestVersion,
        releaseUrl: cached?.releaseUrl || '',
        checkedAt: cached?.checkedAt || '',
        error: cached?.error,
        customers: productCustomers,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[API] Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;
