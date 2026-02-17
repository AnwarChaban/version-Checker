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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [webhookUrl, setWebhookUrl] = useState('');
  const [slackUrl, setSlackUrl] = useState('');
  const [saved, setSaved] = useState(false);

  async function load() {
    const s = await fetchSettings();
    setSettings(s);
    setWebhookUrl(s.webhookUrl || '');
    setSlackUrl(s.slackWebhookUrl || '');
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    await updateSettings({ webhookUrl, slackWebhookUrl: slackUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  return (
    <div>
      <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>Einstellungen</h2>

      <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '24px', maxWidth: '600px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Webhook-URL
          </label>
          <input
            style={inputStyle}
            placeholder="https://example.com/webhook"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
          />
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
            URL für generische Webhook-Benachrichtigungen bei Updates.
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Slack Webhook-URL
          </label>
          <input
            style={inputStyle}
            placeholder="https://hooks.slack.com/services/..."
            value={slackUrl}
            onChange={e => setSlackUrl(e.target.value)}
          />
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
            Slack Incoming Webhook für Update-Benachrichtigungen.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={primaryBtn} onClick={handleSave}>Speichern</button>
          {saved && <span style={{ color: '#6ee7b7', fontSize: '13px' }}>Gespeichert!</span>}
        </div>

        {/* Current settings display */}
        <div style={{ marginTop: '32px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Aktuelle Konfiguration
          </h3>
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
