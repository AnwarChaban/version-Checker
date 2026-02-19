import React, { useEffect, useState } from 'react';
import {
  createConnector,
  deleteConnector,
  fetchConnectorCustomers,
  fetchConnectors,
  fetchCustomProducts,
  fetchScraperProducts,
  fetchSettings,
  syncConnector,
  testConnector,
  type Connector,
  type ConnectorType,
  updateConnector,
  updateConnectorCustomerScope,
  updateSettings,
} from '../../api';

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155',
  borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%',
};
const btnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
  fontSize: '13px', fontWeight: 600,
};
const primaryBtn: React.CSSProperties = { ...btnStyle, backgroundColor: '#3b82f6', color: '#fff' };
const dangerBtn: React.CSSProperties = { ...btnStyle, backgroundColor: '#ef4444', color: '#fff' };
const secondaryBtn: React.CSSProperties = { ...btnStyle, backgroundColor: '#334155', color: '#f1f5f9' };
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
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [showAddConnector, setShowAddConnector] = useState(false);
  const [connectorName, setConnectorName] = useState('');
  const [connectorType, setConnectorType] = useState<ConnectorType>('ninjaone');
  const [connectorBaseUrl, setConnectorBaseUrl] = useState('');
  const [connectorTokenUrl, setConnectorTokenUrl] = useState('');
  const [connectorAuthMode, setConnectorAuthMode] = useState<'apiKey' | 'oauth2ClientCredentials'>('apiKey');
  const [connectorApiKey, setConnectorApiKey] = useState('');
  const [connectorClientId, setConnectorClientId] = useState('');
  const [connectorClientSecret, setConnectorClientSecret] = useState('');
  const [saved, setSaved] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [connectorMessage, setConnectorMessage] = useState('');
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [connectorCustomers, setConnectorCustomers] = useState<Record<number, Array<{ id: number; name: string; enabled: boolean }>>>({});
  const [editingConnectorId, setEditingConnectorId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<ConnectorType>('ninjaone');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editTokenUrl, setEditTokenUrl] = useState('');
  const [editAuthMode, setEditAuthMode] = useState<'apiKey' | 'oauth2ClientCredentials'>('apiKey');
  const [editApiKey, setEditApiKey] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editClientSecret, setEditClientSecret] = useState('');

  async function load() {
    const [s, list, scraperProducts, customProducts] = await Promise.all([
      fetchSettings(),
      fetchConnectors(),
      fetchScraperProducts(),
      fetchCustomProducts(),
    ]);

    const options = [
      ...scraperProducts.map(p => ({ id: p.product, name: p.name })),
      ...customProducts.map(p => ({ id: p.id, name: p.name })),
    ];

    setSettings(s);
    setConnectors(list);
    setProductOptions(options);
    setWebhookUrl(s.webhookUrl || '');
    setSlackUrl(s.slackWebhookUrl || '');
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    await updateSettings({
      webhookUrl,
      slackWebhookUrl: slackUrl,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  async function handleCreateConnector() {
    if (!connectorName.trim()) {
      setConnectorMessage('Bitte einen Namen eingeben.');
      return;
    }

    await createConnector({
      name: connectorName.trim(),
      type: connectorType,
      baseUrl: connectorBaseUrl.trim(),
      tokenUrl: connectorTokenUrl.trim(),
      authMode: connectorAuthMode,
      apiKey: connectorApiKey.trim(),
      clientId: connectorClientId.trim(),
      clientSecret: connectorClientSecret.trim(),
      active: true,
      customerScopeMode: 'manual',
      productScope: [],
      fieldMapping: {},
      uiColor: '',
    });

    setConnectorMessage('Connector wurde angelegt.');
    setShowAddConnector(false);
    setConnectorName('');
    setConnectorType('ninjaone');
    setConnectorBaseUrl('');
    setConnectorTokenUrl('');
    setConnectorAuthMode('apiKey');
    setConnectorApiKey('');
    setConnectorClientId('');
    setConnectorClientSecret('');
    await load();
  }

  function handleStartEdit(connector: Connector) {
    setEditingConnectorId(connector.id);
    setEditName(connector.name);
    setEditType(connector.type);
    setEditBaseUrl(connector.baseUrl || '');
    setEditTokenUrl(connector.tokenUrl || '');
    setEditAuthMode(connector.authMode);
    setEditApiKey(connector.apiKey || '');
    setEditClientId(connector.clientId || '');
    setEditClientSecret(connector.clientSecret || '');
  }

  function handleCancelEdit() {
    setEditingConnectorId(null);
    setEditName('');
    setEditType('ninjaone');
    setEditBaseUrl('');
    setEditTokenUrl('');
    setEditAuthMode('apiKey');
    setEditApiKey('');
    setEditClientId('');
    setEditClientSecret('');
  }

  async function handleSaveEdit(connector: Connector) {
    setBusyId(connector.id);
    try {
      await updateConnector(connector.id, {
        name: editName.trim(),
        type: editType,
        baseUrl: editBaseUrl.trim(),
        tokenUrl: editTokenUrl.trim(),
        authMode: editAuthMode,
        apiKey: editApiKey.trim(),
        clientId: editClientId.trim(),
        clientSecret: editClientSecret.trim(),
      });
      setConnectorMessage(`${connector.name}: Connector gespeichert.`);
      handleCancelEdit();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(connector: Connector) {
    setBusyId(connector.id);
    try {
      await updateConnector(connector.id, { active: !connector.active });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleTestConnector(connector: Connector) {
    setBusyId(connector.id);
    try {
      const result = await testConnector(connector.id);
      setConnectorMessage(`${connector.name}: ${result.message}`);
      await load();
    } catch (error) {
      setConnectorMessage(`${connector.name}: ${(error as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSyncConnector(connector: Connector) {
    setBusyId(connector.id);
    try {
      const result = await syncConnector(connector.id);
      setConnectorMessage(`${connector.name}: Sync abgeschlossen (${result.customers ?? 0} Kunden, ${result.devices ?? 0} Geräte).`);
      await load();
    } catch (error) {
      setConnectorMessage(`${connector.name}: ${(error as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteConnector(connector: Connector) {
    setBusyId(connector.id);
    try {
      await deleteConnector(connector.id);
      setConnectorMessage(`${connector.name} wurde gelöscht.`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleProductScopeToggle(connector: Connector, productId: string) {
    const allIds = productOptions.map(p => p.id);
    const selected = connector.productScope.length === 0 ? new Set(allIds) : new Set(connector.productScope);

    if (selected.has(productId)) {
      selected.delete(productId);
    } else {
      selected.add(productId);
    }

    const next = selected.size === allIds.length ? [] : Array.from(selected);

    setBusyId(connector.id);
    try {
      await updateConnector(connector.id, { productScope: next });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCustomerScopeMode(connector: Connector, mode: 'all' | 'manual') {
    setBusyId(connector.id);
    try {
      await updateConnector(connector.id, { customerScopeMode: mode });
      await load();
      if (mode === 'manual') {
        const result = await fetchConnectorCustomers(connector.id);
        setConnectorCustomers(prev => ({ ...prev, [connector.id]: result.customers }));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleLoadConnectorCustomers(connector: Connector) {
    setBusyId(connector.id);
    try {
      const result = await fetchConnectorCustomers(connector.id);
      setConnectorCustomers(prev => ({ ...prev, [connector.id]: result.customers }));
    } finally {
      setBusyId(null);
    }
  }

  function handleToggleScopedCustomer(connectorId: number, customerId: number) {
    setConnectorCustomers(prev => {
      const list = prev[connectorId] || [];
      return {
        ...prev,
        [connectorId]: list.map(customer => (
          customer.id === customerId
            ? { ...customer, enabled: !customer.enabled }
            : customer
        )),
      };
    });
  }

  async function handleSaveCustomerScope(connector: Connector) {
    const customerIds = (connectorCustomers[connector.id] || [])
      .filter(customer => customer.enabled)
      .map(customer => customer.id);

    setBusyId(connector.id);
    try {
      await updateConnectorCustomerScope(connector.id, customerIds);
      setConnectorMessage(`${connector.name}: Kundenscope gespeichert.`);
      await load();
    } finally {
      setBusyId(null);
    }
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
          <h3 style={sectionTitleStyle}>Connectoren</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Ein Klick: Connector hinzufügen, testen, syncen.</div>
            <button style={primaryBtn} onClick={() => setShowAddConnector(v => !v)}>
              {showAddConnector ? 'Abbrechen' : 'Connector hinzufügen'}
            </button>
          </div>

          {showAddConnector && (
            <div style={{ border: '1px solid #334155', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Name</label>
                  <input style={inputStyle} placeholder="z.B. Kunde A NinjaOne" value={connectorName} onChange={e => setConnectorName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Typ</label>
                  <select style={inputStyle} value={connectorType} onChange={e => setConnectorType(e.target.value as ConnectorType)}>
                    <option value="ninjaone">NinjaOne</option>
                    <option value="unifi">UniFi</option>
                    <option value="sophos">Sophos</option>
                    <option value="generic-http">Generic HTTP</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Basis-URL</label>
                <input style={inputStyle} placeholder="https://api.example.com" value={connectorBaseUrl} onChange={e => setConnectorBaseUrl(e.target.value)} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Token-URL (optional)</label>
                <input style={inputStyle} placeholder="https://auth.example.com/oauth/token" value={connectorTokenUrl} onChange={e => setConnectorTokenUrl(e.target.value)} />
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  Falls OAuth-Token nicht über die Basis-URL läuft.
                </p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Authentifizierung</label>
                <select style={inputStyle} value={connectorAuthMode} onChange={e => setConnectorAuthMode(e.target.value as 'apiKey' | 'oauth2ClientCredentials')}>
                  <option value="apiKey">API Key</option>
                  <option value="oauth2ClientCredentials">OAuth2 Client Credentials</option>
                </select>
              </div>

              {connectorAuthMode === 'apiKey' ? (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>API Key</label>
                  <input style={inputStyle} type="password" placeholder="API Key" value={connectorApiKey} onChange={e => setConnectorApiKey(e.target.value)} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client ID</label>
                    <input style={inputStyle} placeholder="Client ID" value={connectorClientId} onChange={e => setConnectorClientId(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Client Secret</label>
                    <input style={inputStyle} type="password" placeholder="Client Secret" value={connectorClientSecret} onChange={e => setConnectorClientSecret(e.target.value)} />
                  </div>
                </div>
              )}

              <button style={primaryBtn} onClick={handleCreateConnector}>Anlegen</button>
            </div>
          )}

          <div style={{ display: 'grid', gap: '10px' }}>
            {connectors.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '13px' }}>Noch keine Connectoren angelegt.</div>
            ) : connectors.map(connector => (
              <div key={connector.id} style={{ border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{connector.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{connector.type} • {connector.baseUrl || 'ohne URL'}</div>
                  </div>
                  <span style={{ color: connector.active ? '#6ee7b7' : '#fda4af', fontSize: '12px' }}>
                    {connector.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button style={secondaryBtn} disabled={busyId === connector.id} onClick={() => handleStartEdit(connector)}>
                    Bearbeiten
                  </button>
                  <button style={secondaryBtn} disabled={busyId === connector.id} onClick={() => handleToggleActive(connector)}>
                    {connector.active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button style={secondaryBtn} disabled={busyId === connector.id} onClick={() => handleTestConnector(connector)}>Test</button>
                  <button style={primaryBtn} disabled={busyId === connector.id} onClick={() => handleSyncConnector(connector)}>Sync</button>
                  <button style={dangerBtn} disabled={busyId === connector.id} onClick={() => handleDeleteConnector(connector)}>Löschen</button>
                </div>

                {editingConnectorId === connector.id && (
                  <div style={{ marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Connector bearbeiten</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <input style={inputStyle} placeholder="Name" value={editName} onChange={e => setEditName(e.target.value)} />
                      <select style={inputStyle} value={editType} onChange={e => setEditType(e.target.value as ConnectorType)}>
                        <option value="ninjaone">NinjaOne</option>
                        <option value="unifi">UniFi</option>
                        <option value="sophos">Sophos</option>
                        <option value="generic-http">Generic HTTP</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <input style={inputStyle} placeholder="Basis-URL" value={editBaseUrl} onChange={e => setEditBaseUrl(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <input style={inputStyle} placeholder="Token-URL (optional)" value={editTokenUrl} onChange={e => setEditTokenUrl(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <select style={inputStyle} value={editAuthMode} onChange={e => setEditAuthMode(e.target.value as 'apiKey' | 'oauth2ClientCredentials')}>
                        <option value="apiKey">API Key</option>
                        <option value="oauth2ClientCredentials">OAuth2 Client Credentials</option>
                      </select>
                    </div>

                    {editAuthMode === 'apiKey' ? (
                      <div style={{ marginBottom: '8px' }}>
                        <input style={inputStyle} type="password" placeholder="API Key" value={editApiKey} onChange={e => setEditApiKey(e.target.value)} />
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <input style={inputStyle} placeholder="Client ID" value={editClientId} onChange={e => setEditClientId(e.target.value)} />
                        <input style={inputStyle} type="password" placeholder="Client Secret" value={editClientSecret} onChange={e => setEditClientSecret(e.target.value)} />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={primaryBtn} disabled={busyId === connector.id} onClick={() => handleSaveEdit(connector)}>Speichern</button>
                      <button style={secondaryBtn} disabled={busyId === connector.id} onClick={handleCancelEdit}>Abbrechen</button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>
                    Produkte ({connector.productScope.length === 0 ? 'alle aktiv' : `${connector.productScope.length} ausgewählt`})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(160px, 1fr))', gap: '6px' }}>
                    {productOptions.map(product => {
                      const isChecked = connector.productScope.length === 0 || connector.productScope.includes(product.id);
                      return (
                        <label key={`${connector.id}-${product.id}`} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#cbd5e1', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={busyId === connector.id}
                            onChange={() => handleProductScopeToggle(connector, product.id)}
                          />
                          {product.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>Kunden-Scope</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <select
                      style={{ ...inputStyle, maxWidth: '220px' }}
                      value={connector.customerScopeMode}
                      disabled={busyId === connector.id}
                      onChange={e => handleCustomerScopeMode(connector, e.target.value as 'all' | 'manual')}
                    >
                      <option value="all">Alle Kunden automatisch</option>
                      <option value="manual">Nur ausgewählte Kunden</option>
                    </select>

                    {connector.customerScopeMode === 'manual' && (
                      <button style={secondaryBtn} disabled={busyId === connector.id} onClick={() => handleLoadConnectorCustomers(connector)}>
                        Kunden laden
                      </button>
                    )}
                  </div>

                  {connector.customerScopeMode === 'manual' && connectorCustomers[connector.id] && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(160px, 1fr))', gap: '6px', marginBottom: '8px' }}>
                        {connectorCustomers[connector.id].map(customer => (
                          <label key={`${connector.id}-customer-${customer.id}`} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#cbd5e1', fontSize: '12px' }}>
                            <input
                              type="checkbox"
                              checked={customer.enabled}
                              disabled={busyId === connector.id}
                              onChange={() => handleToggleScopedCustomer(connector.id, customer.id)}
                            />
                            {customer.name}
                          </label>
                        ))}
                      </div>
                      <button style={primaryBtn} disabled={busyId === connector.id} onClick={() => handleSaveCustomerScope(connector)}>
                        Kunden-Scope speichern
                      </button>
                    </>
                  )}
                </div>

                {(connector.lastTestStatus || connector.lastSyncStatus) && (
                  <div style={{ marginTop: '8px', color: '#94a3b8', fontSize: '12px' }}>
                    Test: {connector.lastTestStatus || '-'} • Sync: {connector.lastSyncStatus || '-'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {connectorMessage && <div style={{ marginTop: '10px', color: '#6ee7b7', fontSize: '12px' }}>{connectorMessage}</div>}
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
