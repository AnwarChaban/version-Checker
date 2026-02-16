import React from 'react';

type Status = 'up-to-date' | 'update-available' | 'major-update' | 'unknown';

const statusConfig: Record<Status, { label: string; bg: string; color: string }> = {
  'up-to-date': { label: 'Aktuell', bg: '#065f46', color: '#6ee7b7' },
  'update-available': { label: 'Update verfügbar', bg: '#78350f', color: '#fbbf24' },
  'major-update': { label: 'Major Update', bg: '#7f1d1d', color: '#fca5a5' },
  'unknown': { label: 'Unbekannt', bg: '#374151', color: '#9ca3af' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status] || statusConfig.unknown;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: cfg.bg,
      color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}
