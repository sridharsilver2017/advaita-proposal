// src/pages/admin/InvoicesPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Receipt, Plus, Search, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDate } from '../../lib/formatters';
import { Modal } from '../../components/common/Modal';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [executedAgreements, setExecutedAgreements] = useState<any[]>([]);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const [invoiceForm, setInvoiceForm] = useState({
    agreement_id: '',
    milestone_name: '50% Initial Advance Milestone',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    tax_enabled: false
  });

  useEffect(() => {
    loadInvoices();
    loadExecutedAgreements();
  }, [statusFilter]);

  // Open modal if navigated with openGenerateFor state
  useEffect(() => {
    if (location.state && (location.state as any).openGenerateFor) {
      const agr = (location.state as any).openGenerateFor;
      setInvoiceForm(prev => ({
        ...prev,
        agreement_id: agr.id,
        amount: String(agr.details?.price || '')
      }));
      setIsGenerateModalOpen(true);
    }
  }, [location.state]);

  async function loadInvoices() {
    try {
      const q = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await apiRequest(`/api/invoices${q}`);
      if (res.success) {
        setInvoices(res.invoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadExecutedAgreements() {
    try {
      const res = await apiRequest('/api/agreements?status=executed');
      if (res.success) {
        setExecutedAgreements(res.agreements);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGenerateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setGenerating(true);

    try {
      const payload: any = {
        agreement_id: invoiceForm.agreement_id,
        milestone_name: invoiceForm.milestone_name,
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date,
        tax_enabled: invoiceForm.tax_enabled
      };

      if (invoiceForm.amount) {
        payload.items = [{
          description: invoiceForm.milestone_name,
          quantity: 1,
          unit: 'milestone',
          rate: Number(invoiceForm.amount)
        }];
      }

      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setIsGenerateModalOpen(false);
        navigate(`/invoices/${res.invoice.id}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invoice generation blocked by server workflow verification.');
    } finally {
      setGenerating(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    return (
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.agreement_number?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Invoices</h1>
          <p className="text-xs text-stone-500 mt-0.5">Issue milestone invoices and track settlement payments</p>
        </div>
        <button
          onClick={() => {
            setErrorMessage(null);
            setIsGenerateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-2xs transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Generate Invoice
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice #, client, or agreement ref..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
        >
          <option value="all">All Statuses</option>
          <option value="issued">Issued</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-stone-900">No invoices issued</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4">
              Remember: Invoices can only be generated after an agreement is signed by both parties and marked executed.
            </p>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 text-white text-xs font-medium rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Agreement Ref</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="hover:bg-stone-50/80 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-stone-900">
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium">
                      {inv.client_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {inv.agreement_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {formatINR(inv.total_payable)}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-700">
                      {formatINR(inv.balance_due)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {formatDate(inv.due_date)}
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

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Milestone Invoice"
      >
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
            <strong>Rule Verification:</strong> The selected agreement must be in <strong>executed</strong> status with both client and designer signatures on record.
          </div>

          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Select Executed Agreement *
            </label>
            <select
              required
              value={invoiceForm.agreement_id}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, agreement_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition bg-white"
            >
              <option value="">Select an Executed Agreement...</option>
              {executedAgreements.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.agreement_number} — {a.client_name} ({a.project_name})
                </option>
              ))}
            </select>
            {executedAgreements.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">
                No executed agreements found. Both parties must first sign the agreement in the Agreements section.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Milestone Name / Description *
            </label>
            <input
              type="text"
              required
              value={invoiceForm.milestone_name}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, milestone_name: e.target.value })}
              placeholder="e.g. 50% Project Advance Milestone"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Invoice Amount (INR) *
            </label>
            <input
              type="number"
              required
              value={invoiceForm.amount}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
              placeholder="e.g. 75000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={invoiceForm.issue_date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={invoiceForm.due_date}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceForm.tax_enabled}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_enabled: e.target.checked })}
                className="rounded text-stone-900 focus:ring-stone-900"
              />
              <span className="text-xs text-stone-700 font-medium">
                Include GST (Tax). Default is Non-GST.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating || executedAgreements.length === 0}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition"
            >
              {generating ? 'Verifying Preconditions & Generating...' : 'Generate & Issue Invoice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
