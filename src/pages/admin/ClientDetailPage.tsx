// src/pages/admin/ClientDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Archive,
  RefreshCw,
  FolderKanban,
  FileSpreadsheet,
  FileSignature,
  Receipt,
  Plus,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDate } from '../../lib/formatters';

export const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'proposals' | 'agreements' | 'invoices'>('projects');

  useEffect(() => {
    loadClient();
  }, [clientId]);

  async function loadClient() {
    try {
      const res = await apiRequest(`/api/clients/${clientId}`);
      if (res.success) {
        setClient(res.client);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus() {
    const newStatus = client.status === 'active' ? 'archived' : 'active';
    try {
      const res = await apiRequest(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        setClient({ ...client, status: newStatus });
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading client profile...</div>;
  }
  if (!client) {
    return <div className="p-8 text-center text-xs text-rose-500">Client record not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/clients"
            className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-xs text-stone-500 capitalize">{client.type} Client</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleStatus}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-xl transition"
          >
            {client.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {client.status === 'active' ? 'Archive Client' : 'Restore Client'}
          </button>
          <Link
            to={`/proposals/new?client_id=${client.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Proposal
          </Link>
        </div>
      </div>

      {/* Client Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Contact Details
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-stone-600">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span>{client.contact_person || 'No contact person specified'}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <Mail className="w-3.5 h-3.5 text-stone-400" />
              <a href={`mailto:${client.email}`} className="text-stone-900 hover:underline">{client.email}</a>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2 text-stone-600">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>{client.phone}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-stone-600 pt-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>
                {[client.billing_address, client.city, client.state, client.postal_code, client.country]
                  .filter(Boolean)
                  .join(', ') || 'No address provided'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Tax & Internal Notes
          </h2>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Tax Identification</span>
              <p className="font-medium text-stone-800">{client.tax_id || 'Non-Tax / Unspecified'}</p>
            </div>
            <div className="pt-2">
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Internal Notes</span>
              <p className="text-stone-600 italic mt-0.5">{client.notes || 'No internal notes added.'}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Financial Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[10px] text-stone-400 uppercase">Projects</span>
              <p className="text-lg font-bold text-stone-900 mt-0.5">{client.projects?.length || 0}</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[10px] text-stone-400 uppercase">Proposals</span>
              <p className="text-lg font-bold text-stone-900 mt-0.5">{client.proposals?.length || 0}</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[10px] text-stone-400 uppercase">Invoices</span>
              <p className="text-lg font-bold text-stone-900 mt-0.5">{client.invoices?.length || 0}</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[10px] text-stone-400 uppercase">Payments</span>
              <p className="text-lg font-bold text-stone-900 mt-0.5">{client.payments?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Projects, Proposals, Agreements, Invoices */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="border-b border-stone-200 flex px-6 gap-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'projects'
                ? 'border-stone-900 text-stone-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Projects ({client.projects?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'proposals'
                ? 'border-stone-900 text-stone-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Proposals ({client.proposals?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('agreements')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'agreements'
                ? 'border-stone-900 text-stone-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Agreements ({client.agreements?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'invoices'
                ? 'border-stone-900 text-stone-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Invoices ({client.invoices?.length || 0})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'projects' && (
            <div className="space-y-3">
              {client.projects?.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">No projects created yet.</p>
              ) : (
                client.projects.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-stone-900">{p.name}</h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">{p.service_category || 'General Design'}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="space-y-3">
              {client.proposals?.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">No proposals created yet.</p>
              ) : (
                client.proposals.map((pr: any) => (
                  <div
                    key={pr.id}
                    onClick={() => navigate(`/proposals/${pr.id}`)}
                    className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-900">{pr.proposal_number}</span>
                        <span className="text-xs text-stone-600">{pr.title}</span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">Value: {formatINR(pr.total)}</p>
                    </div>
                    <StatusBadge status={pr.status} />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'agreements' && (
            <div className="space-y-3">
              {client.agreements?.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">No agreements generated yet.</p>
              ) : (
                client.agreements.map((a: any) => (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/agreements/${a.id}`)}
                    className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-900">{a.agreement_number}</span>
                      <p className="text-[11px] text-stone-500 mt-0.5">Method: {a.signing_method}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-3">
              {client.invoices?.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">No invoices issued yet.</p>
              ) : (
                client.invoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-900">{inv.invoice_number}</span>
                        <span className="text-xs text-stone-600">{formatINR(inv.total_payable)}</span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">Due: {formatDate(inv.due_date)}</p>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
