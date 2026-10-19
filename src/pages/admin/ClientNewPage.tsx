// src/pages/admin/ClientNewPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Building2, User } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export const ClientNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'company',
    contact_person: '',
    email: '',
    phone: '',
    billing_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    tax_id: '',
    notes: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/api/clients', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (res.success) {
        navigate(`/clients/${res.client.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create client.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/clients"
          className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Add New Client</h1>
          <p className="text-xs text-stone-500">Register a new client organisation or individual</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-6 space-y-6">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Client Type */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
            Client Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'company' })}
              className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                form.type === 'company'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <div>
                <p className="text-xs font-semibold">Company / Brand</p>
                <p className={`text-[10px] ${form.type === 'company' ? 'text-stone-300' : 'text-stone-400'}`}>Business entity</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'individual' })}
              className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                form.type === 'individual'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <User className="w-4 h-4" />
              <div>
                <p className="text-xs font-semibold">Individual / Freelance</p>
                <p className={`text-[10px] ${form.type === 'individual' ? 'text-stone-300' : 'text-stone-400'}`}>Direct client</p>
              </div>
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              {form.type === 'company' ? 'Company Name *' : 'Client Full Name *'}
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.type === 'company' ? 'e.g. Zenith Technologies Pvt Ltd' : 'e.g. Rahul Sharma'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              placeholder="e.g. Sridhar Silver"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Primary Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="client@company.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Tax ID / GSTIN / PAN (Optional)
            </label>
            <input
              type="text"
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              placeholder="e.g. 33AAAAA0000A1Z5"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4 pt-2 border-t border-stone-100">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Billing Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={form.billing_address}
                onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                placeholder="Suite 500, Tech Park Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Chennai / Bangalore"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Tamil Nadu / Karnataka"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                placeholder="600041"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        <div className="pt-2 border-t border-stone-100">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
            Internal Private Notes (Not visible to client)
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Special billing instructions, client background, or preferences..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
          <Link
            to="/clients"
            className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? 'Creating...' : 'Save Client'}
          </button>
        </div>
      </form>
    </div>
  );
};
