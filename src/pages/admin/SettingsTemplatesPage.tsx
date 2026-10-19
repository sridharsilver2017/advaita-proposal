// src/pages/admin/SettingsTemplatesPage.tsx
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Save, CheckCircle2, FileText } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const SettingsTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await apiRequest('/api/settings/templates');
      if (res.success) {
        setTemplates(res.templates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTemplate(t: any) {
    setSavingId(t.id);
    setSuccess(false);
    try {
      const res = await apiRequest(`/api/settings/templates/${t.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: t.name,
          content: t.content
        })
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update template.');
    } finally {
      setSavingId(null);
    }
  }

  const navLinks = [
    { name: 'Business & Brand', href: '/settings/business' },
    { name: 'Document Templates', href: '/settings/templates' },
    { name: 'Workflow Rules', href: '/settings/workflow' },
    { name: 'Security & Access', href: '/settings/security' }
  ];

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading templates...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Settings</h1>
        <p className="text-xs text-stone-500 mt-0.5">Manage contractual legal clauses and standard agreement terms</p>
      </div>

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
          <span>Template terms updated successfully.</span>
        </div>
      )}

      <div className="space-y-6">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-500" />
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">{tmpl.name}</h2>
              </div>
              <span className="text-[10px] font-bold text-stone-400 uppercase">{tmpl.type}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Agreement Legal Clauses
              </label>
              <textarea
                rows={12}
                value={tmpl.content}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemplates(templates.map(t => t.id === tmpl.id ? { ...t, content: val } : t));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 font-mono leading-relaxed transition"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingId === tmpl.id}
                onClick={() => handleUpdateTemplate(tmpl)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                {savingId === tmpl.id ? 'Saving...' : 'Update Legal Template'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
