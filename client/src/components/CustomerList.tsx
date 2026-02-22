import React, { useState } from 'react';
import type { CustomerStatus } from '../api';
import StatusBadge from './StatusBadge';

function formatVersionForDisplay(version: string): string {
  return version.replace(/\+[^\s]+$/, '').trim();
}

export default function CustomerList({ customers }: { customers: CustomerStatus[] }) {
  const [expandedCustomers, setExpandedCustomers] = useState<Record<number, boolean>>({});
  const [expandedDevices, setExpandedDevices] = useState<Record<string, boolean>>({});

  const customersWithUpdates = customers
    .map(customer => ({
      ...customer,
      devices: customer.devices.filter(
        device => device.status === 'update-available' || device.status === 'major-update'
      ),
    }))
    .filter(customer => customer.devices.length > 0);

  if (customersWithUpdates.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '14px' }}>Keine Updates erforderlich</p>;
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {customersWithUpdates.map(customer => {
        const isExpanded = !!expandedCustomers[customer.id];
        const visibleDevices = isExpanded ? customer.devices : customer.devices.slice(0, 4);
        const remainingCount = customer.devices.length - 4;

        return (
        <div key={customer.id} style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
            {customer.name}
            <span style={{ color: '#fbbf24', fontSize: '12px', marginLeft: '8px', fontWeight: 500 }}>
              ({customer.devices.length} Update{customer.devices.length === 1 ? '' : 's'})
            </span>
          </div>
          {visibleDevices.map(device => {
            const deviceKey = `${customer.id}:${device.id}`;
            const isDeviceExpanded = !!expandedDevices[deviceKey];
            const shownDeviceId = device.ninjaDeviceId ?? device.id;

            return (
            <div key={device.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              backgroundColor: '#1e293b',
              borderRadius: '6px',
              marginBottom: '4px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            onClick={e => {
              e.stopPropagation();
              setExpandedDevices(prev => ({ ...prev, [deviceKey]: !prev[deviceKey] }));
            }}>
              <div>
                <div style={{ color: '#cbd5e1' }}>{device.name}</div>
                {isDeviceExpanded && (
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                    Geräte-ID: {shownDeviceId}
                    {device.orgId ? ` · Org-ID: ${device.orgId}` : ''}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {device.status !== 'up-to-date' && (
                  <code style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {formatVersionForDisplay(device.currentVersion)}
                    {device.latestVersion && device.latestVersion !== device.currentVersion ? ` → ${formatVersionForDisplay(device.latestVersion)}` : ''}
                  </code>
                )}
                <StatusBadge status={device.status} />
              </div>
            </div>
          )})}
          {remainingCount > 0 && !isExpanded && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setExpandedCustomers(prev => ({ ...prev, [customer.id]: true }));
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              +{remainingCount} weitere Geräte
            </button>
          )}
          {remainingCount > 0 && isExpanded && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setExpandedCustomers(prev => ({ ...prev, [customer.id]: false }));
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              Weniger anzeigen
            </button>
          )}
        </div>
      )})}
    </div>
  );
}
