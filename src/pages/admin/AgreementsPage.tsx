// src/pages/admin/AgreementsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileSignature, Search, ChevronRight, PenTool } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../lib/formatters';

export const AgreementsPage: React.FC = () => {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadAgreements();
  }, [statusFilter]);

  async function loadAgreements() {
    try {
      const q = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await apiRequest(`/api/agreements${q}`);
      if (res.success) {
        setAgreements(res.agreements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredAgreements = agreements.filter((a) => {
    if (!search) return true;
    return (
      a.agreement_number.toLowerCase().includes(search.toLowerCase()) ||
      a.proposal_number.toLowerCase().includes(search.toLowerCase()) ||
      a.client_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Mutual Service Agreements</h1>
          <p className="text-xs text-stone-500 mt-0.5">Manage legally binding agreements, dual signatures, and document execution</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agreement #, proposal ref, or client..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent_for_signature">Sent for Signature</option>
          <option value="partially_signed">Partially Signed</option>
          <option value="fully_signed">Fully Signed</option>
          <option value="executed">Executed</option>
        </select>
      </div>

      {/* Agreements Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading agreements...</div>
        ) : filteredAgreements.length === 0 ? (
          <div className="p-12 text-center">
            <FileSignature className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-stone-900">No agreements found</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4">
              Agreements are automatically generated once a proposal is accepted by the client.
            </p>
            <Link
              to="/proposals"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 text-white text-xs font-medium rounded-xl"
            >
              View Proposals
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Agreement Number</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Proposal Ref</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Execution Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAgreements.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/agreements/${a.id}`)}
                    className="hover:bg-stone-50/80 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-stone-900">
                        {a.agreement_number}
                      </span>
                      <p className="text-[10px] text-stone-400">v{a.current_version}</p>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium">
                      {a.client_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {a.proposal_number}
                    </td>
                    <td className="py-3 px-4 text-stone-600 capitalize">
                      {a.signing_method}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {formatDate(a.executed_at) || 'Pending Execution'}
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
