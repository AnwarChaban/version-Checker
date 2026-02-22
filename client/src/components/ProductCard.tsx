import React, { useState } from 'react';
import type { ProductStatus } from '../api';
import CustomerList from './CustomerList';

function formatVersionForDisplay(version: string): string {
  return version.replace(/\+[^\s]+$/, '').trim();
}

function getOverallStatus(product: ProductStatus): string {
  const statuses = product.customers.flatMap(c => c.devices.map(d => d.status));
  if (statuses.length === 0) return '#374151';
  if (statuses.includes('major-update')) return '#7f1d1d';
  if (statuses.includes('update-available')) return '#78350f';
  if (statuses.length > 0 && statuses.every(s => s === 'up-to-date')) return '#065f46';
  return '#374151';
}

function getStatusLabel(product: ProductStatus): { label: string; bg: string; color: string } {
  const statuses = product.customers.flatMap(c => c.devices.map(d => d.status));
  if (statuses.length === 0) return { label: 'Unbekannt', bg: '#374151', color: '#9ca3af' };
  if (statuses.includes('major-update')) return { label: 'Major Update', bg: '#7f1d1d', color: '#fca5a5' };
  if (statuses.includes('update-available')) return { label: 'Update verfügbar', bg: '#78350f', color: '#fbbf24' };
  if (statuses.length > 0 && statuses.every(s => s === 'up-to-date')) return { label: 'Aktuell', bg: '#065f46', color: '#6ee7b7' };
  return { label: 'Unbekannt', bg: '#374151', color: '#9ca3af' };
}

export default function ProductCard({ product }: { product: ProductStatus }) {
  const [expanded, setExpanded] = useState(true);
  const borderColor = getOverallStatus(product);
  const status = getStatusLabel(product);
  const totalDevices = product.customers.reduce((sum, c) => sum + c.devices.length, 0);
  const outdatedDevices = product.customers.reduce((sum, c) =>
    sum + c.devices.filter(d => d.status === 'update-available' || d.status === 'major-update').length, 0);

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '20px',
        borderLeft: `4px solid ${borderColor}`,
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px 0' }}>
        {product.productName}
      </h3>

      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: status.bg,
        color: status.color,
        marginBottom: '12px',
      }}>
        {status.label}
      </span>

      {product.latestVersion && (
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 4px 0' }}>
          Version:{' '}
          {product.releaseUrl ? (
            <a href={product.releaseUrl} target="_blank" rel="noopener noreferrer"
               onClick={e => e.stopPropagation()}
               style={{ color: '#60a5fa', textDecoration: 'none' }}>
              {formatVersionForDisplay(product.latestVersion)}
            </a>
          ) : (
            <span style={{ color: '#e2e8f0' }}>{formatVersionForDisplay(product.latestVersion)}</span>
          )}
        </p>
      )}

      {totalDevices > 0 && (
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0' }}>
          {outdatedDevices > 0
            ? `${outdatedDevices}/${totalDevices} Geräte veraltet`
            : `${totalDevices} Geräte aktuell`}
        </p>
      )}

      {product.error && (
        <p style={{ fontSize: '12px', color: '#f87171', margin: '8px 0 0 0' }}>{product.error}</p>
      )}

      {expanded && product.customers.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
          <CustomerList customers={product.customers} />
        </div>
      )}
    </div>
  );
}
