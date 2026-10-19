// src/pages/admin/SettingsBusinessPage.tsx
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Save, CheckCircle2, Building, Shield } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const SettingsBusinessPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await apiRequest('/api/settings/business');
      if (res.success) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await apiRequest('/api/settings/business', {
        method: 'PATCH',
        body: JSON.stringify(settings)
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const navLinks = [
    { name: 'Business & Brand', href: '/settings/business' },
    { name: 'Document Templates', href: '/settings/templates' },
    { name: 'Workflow Rules', href: '/settings/workflow' },
    { name: 'Security & Access', href: '/settings/security' }
  ];

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Settings</h1>
        <p className="text-xs text-stone-500 mt-0.5">Configure studio profile, banking, legal defaults, and visual branding</p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="border-b border-stone-200 flex gap-6 text-xs font-medium">
        {navLinks.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.href}
            className={({ isActive }) =>
              `py-2.5 border-b-2 transition ${
                isActive
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`
            }
          >
            {tab.name}
          </NavLink>
        ))}
      </div>

      {success && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Business settings successfully updated and saved.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand & Identity */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Brand Identity & Contact
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Business Display Name
              </label>
              <input
                type="text"
                value={settings.business_name || ''}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Studio Tagline
              </label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Phone
              </label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={settings.address_line1 || ''}
                onChange={(e) => setSettings({ ...settings, address_line1: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                City & State
              </label>
              <input
                type="text"
                value={`${settings.city || 'Chennai'}, ${settings.state || 'Tamil Nadu'}`}
                onChange={(e) => {
                  const [c, s] = e.target.value.split(',');
                  setSettings({ ...settings, city: c?.trim() || '', state: s?.trim() || '' });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Default Currency
              </label>
              <input
                type="text"
                value={settings.currency || 'INR'}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>
          </div>
        </div>

        {/* Banking & UPI Payment Instructions */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Banking & Indian UPI Settlement Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={settings.bank_name || ''}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={settings.bank_account_number || ''}
                onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={settings.bank_ifsc || ''}
                onChange={(e) => setSettings({ ...settings, bank_ifsc: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                UPI ID (e.g. VPA for QR Code)
              </label>
              <input
                type="text"
                value={settings.upi_id || ''}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition font-mono"
              />
            </div>
          </div>
        </div>

        {/* Legal & Document Footers */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Document Seals & Footers
          </h2>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Document Footer Text
            </label>
            <input
              type="text"
              value={settings.document_footer || ''}
              onChange={(e) => setSettings({ ...settings, document_footer: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
