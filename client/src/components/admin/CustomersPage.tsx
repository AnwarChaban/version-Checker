import React, { useEffect, useState } from 'react';
import {
  fetchCustomers, createCustomer, updateCustomer, deleteCustomer,
  createDevice, updateDevice, deleteDevice,
  fetchScraperProducts, fetchCustomProducts,
  type MockCustomer, type MockDevice, type ScraperProduct, type CustomProduct,
} from '../../api';

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155',
  borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', outline: 'none',
};
const btnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
  fontSize: '13px', fontWeight: 600,
};
const primaryBtn: React.CSSProperties = { ...btnStyle, backgroundColor: '#3b82f6', color: '#fff' };
const dangerBtn: React.CSSProperties = { ...btnStyle, backgroundColor: '#7f1d1d', color: '#fca5a5' };
const ghostBtn: React.CSSProperties = { ...btnStyle, backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<MockCustomer[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<{ id: number; name: string } | null>(null);
  const [addingDevice, setAddingDevice] = useState<number | null>(null);
  const [deviceForm, setDeviceForm] = useState({ name: '', product: '', currentVersion: '' });
  const [editingDevice, setEditingDevice] = useState<(MockDevice & { customerId: number }) | null>(null);

  async function load() {
    const [c, sp, cp] = await Promise.all([fetchCustomers(), fetchScraperProducts(), fetchCustomProducts()]);
    setCustomers(c);
    setProducts([...sp.map(p => p.product), ...cp.map(p => p.id)]);
  }

  useEffect(() => { load(); }, []);

  async function handleCreateCustomer() {
    if (!newName.trim()) return;
    await createCustomer(newName.trim());
    setNewName('');
    load();
  }

  async function handleUpdateCustomer() {
    if (!editingCustomer || !editingCustomer.name.trim()) return;
    await updateCustomer(editingCustomer.id, editingCustomer.name.trim());
    setEditingCustomer(null);
    load();
  }

  async function handleDeleteCustomer(id: number) {
    if (!confirm('Kunde und alle Geräte löschen?')) return;
    await deleteCustomer(id);
    load();
  }

  async function handleCreateDevice(customerId: number) {
    if (!deviceForm.name || !deviceForm.product || !deviceForm.currentVersion) return;
    await createDevice(customerId, deviceForm);
    setAddingDevice(null);
    setDeviceForm({ name: '', product: '', currentVersion: '' });
    load();
  }

  async function handleUpdateDevice() {
    if (!editingDevice) return;
    await updateDevice(editingDevice.id, {
      name: editingDevice.name,
      product: editingDevice.product,
      currentVersion: editingDevice.currentVersion,
    });
    setEditingDevice(null);
    load();
  }

  async function handleDeleteDevice(id: number) {
    if (!confirm('Gerät löschen?')) return;
    await deleteDevice(id);
    load();
  }

  return (
    <div>
      <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>Kunden & Geräte</h2>

      {/* Add Customer */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Neuer Kundenname..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateCustomer()}
        />
        <button style={primaryBtn} onClick={handleCreateCustomer}>Kunde hinzufügen</button>
      </div>

      {/* Customer List */}
      {customers.map(customer => (
        <div key={customer.id} style={{
          backgroundColor: '#1e293b', borderRadius: '10px', padding: '20px', marginBottom: '16px',
        }}>
          {/* Customer Header */}
          {editingCustomer?.id === customer.id ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={editingCustomer.name}
                onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleUpdateCustomer()}
              />
              <button style={primaryBtn} onClick={handleUpdateCustomer}>Speichern</button>
              <button style={ghostBtn} onClick={() => setEditingCustomer(null)}>Abbrechen</button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                {customer.name}
                <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 400, marginLeft: '8px' }}>
                  ({customer.devices.length} Geräte)
                </span>
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={ghostBtn} onClick={() => setEditingCustomer({ id: customer.id, name: customer.name })}>Bearbeiten</button>
                <button style={dangerBtn} onClick={() => handleDeleteCustomer(customer.id)}>Löschen</button>
              </div>
            </div>
          )}

          {/* Devices Table */}
          {customer.devices.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Gerät</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Produkt</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Version</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {customer.devices.map(device => (
                  <tr key={device.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    {editingDevice?.id === device.id ? (
                      <>
                        <td style={{ padding: '8px' }}>
                          <input style={{ ...inputStyle, width: '100%' }} value={editingDevice.name}
                            onChange={e => setEditingDevice({ ...editingDevice, name: e.target.value })} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select style={{ ...inputStyle, width: '100%' }} value={editingDevice.product}
                            onChange={e => setEditingDevice({ ...editingDevice, product: e.target.value })}>
                            {products.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input style={{ ...inputStyle, width: '100%' }} value={editingDevice.currentVersion}
                            onChange={e => setEditingDevice({ ...editingDevice, currentVersion: e.target.value })} />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button style={primaryBtn} onClick={handleUpdateDevice}>OK</button>
                            <button style={ghostBtn} onClick={() => setEditingDevice(null)}>X</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '8px', color: '#e2e8f0', fontSize: '14px' }}>{device.name}</td>
                        <td style={{ padding: '8px', color: '#94a3b8', fontSize: '14px' }}>{device.product}</td>
                        <td style={{ padding: '8px', color: '#94a3b8', fontSize: '14px', fontFamily: 'monospace' }}>{device.currentVersion}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button style={ghostBtn} onClick={() => setEditingDevice({ ...device, customerId: customer.id })}>Bearbeiten</button>
                            <button style={dangerBtn} onClick={() => handleDeleteDevice(device.id)}>Löschen</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Add Device */}
          {addingDevice === customer.id ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input style={inputStyle} placeholder="Gerätename" value={deviceForm.name}
                onChange={e => setDeviceForm({ ...deviceForm, name: e.target.value })} />
              <select style={inputStyle} value={deviceForm.product}
                onChange={e => setDeviceForm({ ...deviceForm, product: e.target.value })}>
                <option value="">Produkt wählen...</option>
                {products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input style={inputStyle} placeholder="Version (z.B. 7.2.1)" value={deviceForm.currentVersion}
                onChange={e => setDeviceForm({ ...deviceForm, currentVersion: e.target.value })} />
              <button style={primaryBtn} onClick={() => handleCreateDevice(customer.id)}>Hinzufügen</button>
              <button style={ghostBtn} onClick={() => { setAddingDevice(null); setDeviceForm({ name: '', product: '', currentVersion: '' }); }}>Abbrechen</button>
            </div>
          ) : (
            <button style={{ ...ghostBtn, fontSize: '12px' }} onClick={() => setAddingDevice(customer.id)}>+ Gerät hinzufügen</button>
          )}
        </div>
      ))}

      {customers.length === 0 && (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Keine Kunden vorhanden. Erstellen Sie einen neuen Kunden.</p>
      )}
    </div>
  );
}
