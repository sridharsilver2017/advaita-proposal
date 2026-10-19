// src/pages/admin/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  FileSpreadsheet,
  FileSignature,
  Receipt,
  CreditCard,
  AlertCircle,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatINR, formatDateTime } from '../../lib/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await apiRequest('/api/dashboard');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-stone-400 text-sm">Loading studio metrics...</div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const pendingActions = data?.pendingActions || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Studio Dashboard</h1>
          <p className="text-xs text-stone-500 mt-1">Live operational status and client engagement pipeline</p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/clients/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium rounded-xl shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </Link>
          <Link
            to="/proposals/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Proposal
          </Link>
        </div>
      </div>

      {/* Pending Actions Alert Callouts */}
      {pendingActions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pending Action Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingActions.map((action: any, idx: number) => (
              <div
                key={idx}
                onClick={() => navigate(action.link)}
                className="p-4 bg-amber-50/70 border border-amber-200/80 hover:border-amber-300 rounded-xl cursor-pointer transition shadow-2xs flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {action.badge}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h3 className="text-xs font-bold text-stone-900">{action.title}</h3>
                  <p className="text-[11px] text-stone-600 mt-0.5">{action.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Active Clients */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Active Clients</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{stats.activeClients}</div>
          <p className="text-[11px] text-stone-400 mt-1">Total verified records</p>
        </div>

        {/* Active Projects */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Active Projects</span>
            <FolderKanban className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{stats.activeProjects}</div>
          <p className="text-[11px] text-stone-400 mt-1">Engagements in pipeline</p>
        </div>

        {/* Proposals Awaiting Response */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Proposals Sent</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{stats.proposalsAwaitingResponse}</div>
          <p className="text-[11px] text-sky-600 font-medium mt-1">Awaiting client decision</p>
        </div>

        {/* Accepted Awaiting Agreements */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Accepted Proposals</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{stats.acceptedAwaitingAgreements}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Ready for agreement</p>
        </div>

        {/* Agreements Awaiting Signatures */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Pending Signatures</span>
            <FileSignature className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{stats.agreementsAwaitingSignatures}</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Dual sign in progress</p>
        </div>

        {/* Agreements Awaiting Invoicing */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Ready to Invoice</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{stats.agreementsAwaitingInvoicing}</div>
          <p className="text-[11px] text-teal-600 font-medium mt-1">Agreements executed</p>
        </div>

        {/* Outstanding Invoices */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Outstanding Due</span>
            <Receipt className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-xl font-bold text-stone-900">{formatINR(stats.outstandingAmount)}</div>
          <p className="text-[11px] text-stone-500 mt-1">{stats.outstandingInvoices} invoice(s)</p>
        </div>

        {/* Overdue Invoices */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-700">{formatINR(stats.overdueAmount)}</div>
          <p className="text-[11px] text-rose-600 font-medium mt-1">{stats.overdueInvoices} overdue</p>
        </div>

        {/* Total Payments Collected */}
        <div className="p-4 bg-stone-900 text-white rounded-xl shadow-2xs col-span-2">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Total Collected Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(stats.totalPaymentsReceived)}</div>
          <p className="text-[11px] text-stone-400 mt-1">Verified settlement receipts</p>
        </div>
      </div>

      {/* Main Grid: Pipeline & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Engagement Lifecycle Guide */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900">Lifecycle Workflow Pipeline</h2>
            <span className="text-xs text-stone-400">Strict Enforcement Active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Stage 1</span>
              <h3 className="text-xs font-bold text-stone-900 mt-1">Proposal Acceptance</h3>
              <p className="text-[11px] text-stone-500 mt-1">
                Client reviews scope & pricing in secure portal and explicitly accepts terms.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Stage 2</span>
              <h3 className="text-xs font-bold text-stone-900 mt-1">Mutual Agreement</h3>
              <p className="text-[11px] text-stone-500 mt-1">
                Terms derived from accepted proposal. Legal clauses, IP, and milestones generated.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Stage 3</span>
              <h3 className="text-xs font-bold text-stone-900 mt-1">Dual Signatures</h3>
              <p className="text-[11px] text-stone-500 mt-1">
                Both parties sign digitally or via physical print/upload. Sealed with SHA-256 hash.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Stage 4</span>
              <h3 className="text-xs font-bold text-stone-900 mt-1">Invoice & Payment</h3>
              <p className="text-[11px] text-stone-500 mt-1">
                Invoice generation unlocks ONLY after execution. Indian INR / UPI payment tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Audit Activity */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900">Recent Audit Log</h2>
            <Link to="/reports" className="text-xs text-stone-500 hover:text-stone-900">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No recent activity recorded.</p>
            ) : (
              recentActivity.map((log: any) => (
                <div key={log.id} className="text-xs flex items-start gap-2.5 pb-2 border-b border-stone-50 last:border-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-800 capitalize truncate">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-stone-400">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
