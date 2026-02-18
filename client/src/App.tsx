import React, { useEffect, useState } from 'react';
import { fetchProducts, fetchSettings, type ProductStatus } from './api';
import ProductCard from './components/ProductCard';
import AdminLayout from './components/AdminLayout';

const REFRESH_INTERVAL = 60_000; // Auto-refresh every 60 seconds

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash;
}

function Dashboard() {
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
      setMockMode(settings.mockMode === 'false');
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a
              href="#/admin"
              style={{
                padding: '6px 14px', borderRadius: '6px', border: '1px solid #334155',
                color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              }}
            >
              Admin
            </a>
            {lastUpdate && (
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                Aktualisiert: {lastUpdate.toLocaleTimeString('de-DE')}
              </span>
            )}
          </div>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
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

export default function App() {
  const hash = useHash();
  const isAdmin = hash.startsWith('#/admin');

  return isAdmin ? <AdminLayout /> : <Dashboard />;
}
