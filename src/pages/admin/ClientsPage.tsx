// src/pages/admin/ClientsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, User, Mail, Phone, ChevronRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../lib/formatters';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, [search, status]);

  async function loadClients() {
    try {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (search) query.set('search', search);

      const res = await apiRequest(`/api/clients?${query.toString()}`);
      if (res.success) {
        setClients(res.clients);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Clients</h1>
          <p className="text-xs text-stone-500 mt-0.5">Manage client directory, engagements, and billing profiles</p>
        </div>
        <Link
          to="/clients/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-2xs transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Client
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, contact or email..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatus('active')}
            className={`px-3 py-2 text-xs font-medium rounded-xl border transition ${
              status === 'active'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatus('archived')}
            className={`px-3 py-2 text-xs font-medium rounded-xl border transition ${
              status === 'archived'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            Archived
          </button>
          <button
            onClick={() => setStatus('all')}
            className={`px-3 py-2 text-xs font-medium rounded-xl border transition ${
              status === 'all'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Clients Table / List */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-stone-900">No clients found</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4">Add your first client to start creating proposals.</p>
            <Link
              to="/clients/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="hover:bg-stone-50/80 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-xs uppercase">
                          {c.type === 'company' ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 group-hover:text-stone-700 transition">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-stone-400 capitalize">{c.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-stone-800 font-medium">{c.contact_person || '—'}</p>
                      <p className="text-[11px] text-stone-400">{c.email}</p>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {c.city ? `${c.city}, ${c.country}` : c.country}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-800 group-hover:translate-x-0.5 transition inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
