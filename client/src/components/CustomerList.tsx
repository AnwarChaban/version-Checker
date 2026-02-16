import React from 'react';
import type { CustomerStatus } from '../api';
import StatusBadge from './StatusBadge';

export default function CustomerList({ customers }: { customers: CustomerStatus[] }) {
  if (customers.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '14px' }}>Keine Kunden mit diesem Produkt</p>;
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {customers.map(customer => (
        <div key={customer.id} style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
            {customer.name}
          </div>
          {customer.devices.map(device => (
            <div key={device.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              backgroundColor: '#1e293b',
              borderRadius: '6px',
              marginBottom: '4px',
              fontSize: '13px',
            }}>
              <span style={{ color: '#cbd5e1' }}>{device.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <code style={{ color: '#94a3b8', fontSize: '12px' }}>{device.currentVersion}</code>
                <StatusBadge status={device.status} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
