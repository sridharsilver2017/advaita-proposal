// src/pages/admin/ReportsPage.tsx
import React, { useEffect, useState } from 'react';
import { BarChart3, Download, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatINR } from '../../lib/formatters';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const res = await apiRequest('/api/reports/summary');
      if (res.success) {
        setData(res.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    window.location.href = '/api/reports/export-invoices-csv';
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading financial reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Financial Reports</h1>
          <p className="text-xs text-stone-500 mt-0.5">Audited breakdown of pipeline conversion, invoiced receivables, and collected settlements</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium rounded-xl shadow-2xs transition self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export Invoices CSV
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Proposal Acceptance Rate</span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{data?.acceptanceRate || 0}%</p>
          <p className="text-[11px] text-stone-500 mt-0.5">{data?.totalProposalsAccepted} of {data?.totalProposalsSent} accepted</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Invoiced Billing</span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{formatINR(data?.totalInvoiced)}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Sum of all issued invoices</p>
        </div>

        <div className="p-5 bg-stone-900 text-white rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Collected Revenue</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatINR(data?.totalCollected)}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">Actual funds in bank/UPI</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Outstanding Receivables</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{formatINR(data?.totalOutstanding)}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Pending client payments</p>
        </div>
      </div>

      {/* Client Breakdown Table */}
      <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Client Invoicing & Settlement Breakdown</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-3">Client Name</th>
                <th className="py-2.5 px-3">Projects</th>
                <th className="py-2.5 px-3">Total Invoiced</th>
                <th className="py-2.5 px-3">Total Collected</th>
                <th className="py-2.5 px-3">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(data?.clientBreakdown || []).map((c: any, idx: number) => {
                const outstanding = Math.max(0, c.total_invoiced - c.total_collected);
                return (
                  <tr key={idx} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-3 font-semibold text-stone-900">{c.client_name}</td>
                    <td className="py-3 px-3 text-stone-600">{c.project_count}</td>
                    <td className="py-3 px-3 font-medium text-stone-900">{formatINR(c.total_invoiced)}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">{formatINR(c.total_collected)}</td>
                    <td className={`py-3 px-3 font-bold ${outstanding > 0 ? 'text-rose-700' : 'text-stone-500'}`}>
                      {formatINR(outstanding)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
