import React, { useEffect, useState } from 'react';
import { fetchProducts, fetchSettings, type ProductStatus } from './api';
import ProductCard from './components/ProductCard';

const REFRESH_INTERVAL = 60_000; // Auto-refresh every 60 seconds

export default function App() {
  const [products, setProducts] = useState<ProductStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [mockMode, setMockMode] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function loadProducts() {
    try {
      const data = await fetchProducts();
      setProducts(data);
      setLastUpdate(new Date());
      setError('');
    } catch (e) {
      setError('Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const settings = await fetchSettings();
      setMockMode(settings.mockMode === 'true');
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadProducts();
    loadSettings();

    // Auto-refresh dashboard
    const interval = setInterval(loadProducts, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const totalDevices = products.reduce((sum, p) => sum + p.customers.reduce((s, c) => s + c.devices.length, 0), 0);
  const updatesAvailable = products.reduce((sum, p) =>
    sum + p.customers.reduce((s, c) =>
      s + c.devices.filter(d => d.status === 'update-available' || d.status === 'major-update').length, 0), 0);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 16px' }}>
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9' }}>
              Version Checker
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              {totalDevices} Geräte überwacht
              {updatesAvailable > 0 && (
                <span style={{ color: '#fbbf24', marginLeft: '12px' }}>
                  {updatesAvailable} Update(s) verfügbar
                </span>
              )}
              {mockMode && (
                <span style={{
                  marginLeft: '12px',
                  padding: '2px 8px',
                  backgroundColor: '#4c1d95',
                  color: '#c4b5fd',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}>
                  DEMO
                </span>
              )}
            </p>
          </div>
          {lastUpdate && (
            <span style={{ color: '#64748b', fontSize: '12px' }}>
              Aktualisiert: {lastUpdate.toLocaleTimeString('de-DE')}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#7f1d1d',
          borderRadius: '8px',
          color: '#fca5a5',
          marginBottom: '16px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Lade Daten...</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '16px',
        }}>
          {products.map(product => (
            <ProductCard key={product.product} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
