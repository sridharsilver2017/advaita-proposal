// src/pages/admin/ProposalsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileSpreadsheet, Search, ChevronRight, Copy, Check } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDate } from '../../lib/formatters';

export const ProposalsPage: React.FC = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProposals();
  }, [statusFilter]);

  async function loadProposals() {
    try {
      const q = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await apiRequest(`/api/proposals${q}`);
      if (res.success) {
        setProposals(res.proposals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function copyPortalLink(e: React.MouseEvent, token: string) {
    e.stopPropagation();
    const url = `${window.location.origin}/portal/${token}/proposal`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const filteredProposals = proposals.filter((p) => {
    if (!search) return true;
    return (
      p.proposal_number.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Proposals</h1>
          <p className="text-xs text-stone-500 mt-0.5">Author, version, and dispatch high-conversion project proposals</p>
        </div>
        <Link
          to="/proposals/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-2xs transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Proposal
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
            placeholder="Search by proposal #, title, or client..."
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
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Proposals List */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading proposals...</div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-stone-900">No proposals found</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4">Start drafting your first client proposal.</p>
            <Link
              to="/proposals/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 text-white text-xs font-medium rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Proposal
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Proposal Number</th>
                  <th className="py-3 px-4">Title & Project</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-right">Portal Link</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProposals.map((pr) => (
                  <tr
                    key={pr.id}
                    onClick={() => navigate(`/proposals/${pr.id}`)}
                    className="hover:bg-stone-50/80 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-stone-900">
                        {pr.proposal_number}
                      </span>
                      <p className="text-[10px] text-stone-400">v{pr.current_version}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-stone-900 group-hover:text-stone-700 transition">
                        {pr.title}
                      </p>
                      <p className="text-[11px] text-stone-400">{pr.project_name}</p>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium">
                      {pr.client_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {formatINR(pr.total)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={pr.status} />
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {formatDate(pr.valid_until)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => copyPortalLink(e, pr.portal_token)}
                        title="Copy Client Portal Link"
                        className="px-2 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition inline-flex items-center gap-1"
                      >
                        {copiedToken === pr.portal_token ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-stone-500" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
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
