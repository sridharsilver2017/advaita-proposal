// src/pages/admin/PaymentsPage.tsx
import React, { useEffect, useState } from 'react';
import { CreditCard, Search, ArrowUpRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';
import { Link } from 'react-router-dom';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      const res = await apiRequest('/api/payments');
      if (res.success) {
        setPayments(res.payments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    return (
      p.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.transaction_reference && p.transaction_reference.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Payments & Receipts</h1>
          <p className="text-xs text-stone-500 mt-0.5">Audit log of all received settlements and client transactions</p>
        </div>
        <div className="p-3 bg-stone-900 text-white rounded-xl flex items-center gap-4 text-xs">
          <span className="text-stone-400">Total Collected:</span>
          <span className="text-base font-bold text-emerald-400">{formatINR(totalCollected)}</span>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice #, client name, or transaction reference..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400">
            <CreditCard className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            No payment entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-4 text-stone-800 font-medium">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {p.client_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-stone-700">
                      {p.invoice_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4 uppercase font-mono text-[10px] text-stone-600">
                      {p.payment_method}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-500 text-[11px]">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="py-3 px-4 text-stone-500 text-[11px]">
                      {p.recorded_by}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/invoices/${p.invoice_id}`}
                        className="text-stone-400 hover:text-stone-900 inline-block p-1"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
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
