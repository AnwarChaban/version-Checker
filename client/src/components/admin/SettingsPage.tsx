import React, { useEffect, useState } from 'react';
import { fetchSettings, updateSettings } from '../../api';

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155',
  borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%',
};
const btnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
  fontSize: '13px', fontWeight: 600,
};
const primaryBtn: React.CSSProperties = { ...btnStyle, backgroundColor: '#3b82f6', color: '#fff' };
const cardStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '10px',
  padding: '20px',
};
const sectionTitleStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '14px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '12px',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [webhookUrl, setWebhookUrl] = useState('');
  const [slackUrl, setSlackUrl] = useState('');
  const [ninjaApiUrl, setNinjaApiUrl] = useState('');
  const [ninjaApiKey, setNinjaApiKey] = useState('');
  const [ninjaClientId, setNinjaClientId] = useState('');
  const [ninjaClientSecret, setNinjaClientSecret] = useState('');
  const [unifiApiUrl, setUnifiApiUrl] = useState('');
  const [unifiApiKey, setUnifiApiKey] = useState('');
  const [unifiClientId, setUnifiClientId] = useState('');
  const [unifiClientSecret, setUnifiClientSecret] = useState('');
  const [sophosApiUrl, setSophosApiUrl] = useState('');
  const [sophosApiKey, setSophosApiKey] = useState('');
  const [sophosClientId, setSophosClientId] = useState('');
  const [sophosClientSecret, setSophosClientSecret] = useState('');
  const [saved, setSaved] = useState(false);

  async function load() {
    const s = await fetchSettings();
    setSettings(s);
    setWebhookUrl(s.webhookUrl || '');
    setSlackUrl(s.slackWebhookUrl || '');
    setNinjaApiUrl(s.ninjaoneApiUrl || '');
    setNinjaApiKey(s.ninjaoneApiKey || '');
    setNinjaClientId(s.ninjaoneClientId || '');
    setNinjaClientSecret(s.ninjaoneClientSecret || '');
    setUnifiApiUrl(s.unifiApiUrl || '');
    setUnifiApiKey(s.unifiApiKey || '');
    setUnifiClientId(s.unifiClientId || '');
    setUnifiClientSecret(s.unifiClientSecret || '');
    setSophosApiUrl(s.sophosApiUrl || '');
    setSophosApiKey(s.sophosApiKey || '');
    setSophosClientId(s.sophosClientId || '');
    setSophosClientSecret(s.sophosClientSecret || '');
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    await updateSettings({
      webhookUrl,
      slackWebhookUrl: slackUrl,
      ninjaoneApiUrl: ninjaApiUrl,
      ninjaoneApiKey: ninjaApiKey,
      ninjaoneClientId: ninjaClientId,
      ninjaoneClientSecret: ninjaClientSecret,
      unifiApiUrl,
      unifiApiKey,
      unifiClientId,
      unifiClientSecret,
      sophosApiUrl,
      sophosApiKey,
      sophosClientId,
      sophosClientSecret,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  return (
    <div>
      <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>Einstellungen</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(320px, 1fr))', gap: '16px', maxWidth: '1200px' }}>
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Benachrichtigungen</h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Webhook-URL</label>
            <input style={inputStyle} placeholder="https://example.com/webhook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>URL für generische Webhook-Benachrichtigungen bei Updates.</p>
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Slack Webhook-URL</label>
            <input style={inputStyle} placeholder="https://hooks.slack.com/services/..." value={slackUrl} onChange={e => setSlackUrl(e.target.value)} />
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Slack Incoming Webhook für Update-Benachrichtigungen.</p>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>NinjaOne</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>API-URL</label>
            <input style={inputStyle} placeholder="https://eu.ninjarmm.com/v2" value={ninjaApiUrl} onChange={e => setNinjaApiUrl(e.target.value)} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>API Key (optional)</label>
            <input style={inputStyle} type="password" placeholder="NinjaOne API Key" value={ninjaApiKey} onChange={e => setNinjaApiKey(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client ID</label>
              <input style={inputStyle} placeholder="Client ID" value={ninjaClientId} onChange={e => setNinjaClientId(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client Secret</label>
              <input style={inputStyle} type="password" placeholder="Client Secret" value={ninjaClientSecret} onChange={e => setNinjaClientSecret(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>UniFi</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>API-URL</label>
            <input style={inputStyle} placeholder="https://fw-update.ubnt.com/api/..." value={unifiApiUrl} onChange={e => setUnifiApiUrl(e.target.value)} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>API Key (optional)</label>
            <input style={inputStyle} type="password" placeholder="UniFi API Key" value={unifiApiKey} onChange={e => setUnifiApiKey(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client ID</label>
              <input style={inputStyle} placeholder="Client ID" value={unifiClientId} onChange={e => setUnifiClientId(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client Secret</label>
              <input style={inputStyle} type="password" placeholder="Client Secret" value={unifiClientSecret} onChange={e => setUnifiClientSecret(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Sophos</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>API-URL</label>
            <input style={inputStyle} placeholder="https://docs.sophos.com/releasenotes/..." value={sophosApiUrl} onChange={e => setSophosApiUrl(e.target.value)} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>API Key (optional)</label>
            <input style={inputStyle} type="password" placeholder="Sophos API Key" value={sophosApiKey} onChange={e => setSophosApiKey(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client ID</label>
              <input style={inputStyle} placeholder="Client ID" value={sophosClientId} onChange={e => setSophosClientId(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client Secret</label>
              <input style={inputStyle} type="password" placeholder="Client Secret" value={sophosClientSecret} onChange={e => setSophosClientSecret(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Aktionen</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={primaryBtn} onClick={handleSave}>Speichern</button>
            {saved && <span style={{ color: '#6ee7b7', fontSize: '13px' }}>Gespeichert!</span>}
          </div>
        </div>

        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <h3 style={sectionTitleStyle}>Aktuelle Konfiguration</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(settings).map(([key, value]) => (
                <tr key={key} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '8px', color: '#94a3b8', fontSize: '13px', fontFamily: 'monospace' }}>{key}</td>
                  <td style={{ padding: '8px', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {value || <span style={{ color: '#475569' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
