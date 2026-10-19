// src/pages/admin/InvoiceDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Download,
  QrCode,
  Building,
  Plus
} from 'lucide-react';
import QRCode from 'qrcode';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';

export const InvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'upi',
    transaction_reference: '',
    notes: ''
  });

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    try {
      const res = await apiRequest(`/api/invoices/${invoiceId}`);
      if (res.success) {
        setInvoice(res.invoice);
        setPaymentForm(prev => ({ ...prev, amount: String(res.invoice.balance_due) }));

        // Generate UPI QR code for balance due
        if (res.invoice.balance_due > 0) {
          const upiString = `upi://pay?pa=advaita@okhdfcbank&pn=Advaita%20Designs&am=${res.invoice.balance_due}&cu=INR&tn=Invoice%20${res.invoice.invoice_number}`;
          QRCode.toDataURL(upiString, { width: 200, margin: 1 }, (err, url) => {
            if (!err) setUpiQrUrl(url);
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPayError(null);
    setPayLoading(true);

    try {
      const res = await apiRequest(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentForm)
      });
      if (res.success) {
        setIsPayModalOpen(false);
        loadInvoice();
      }
    } catch (err: any) {
      setPayError(err.message || 'Payment recording failed.');
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading invoice...</div>;
  }
  if (!invoice) {
    return <div className="p-8 text-center text-xs text-rose-500">Invoice not found.</div>;
  }

  const items = invoice.items || [];
  const payments = invoice.payments || [];
  const isPaid = invoice.status === 'paid';

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-stone-900">{invoice.invoice_number}</span>
              <StatusBadge status={invoice.status} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-stone-900">
              Invoice for {invoice.client_name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPaid && (
            <button
              onClick={() => {
                setPayError(null);
                setPaymentForm(prev => ({ ...prev, amount: String(invoice.balance_due) }));
                setIsPayModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Balance Summary Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Payable</span>
          <p className="text-xl font-bold text-stone-900 mt-1">{formatINR(invoice.total_payable)}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Agreement: {invoice.agreement_number}</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Paid</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatINR(invoice.amount_paid)}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">{payments.length} payment(s) recorded</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Balance Due</span>
          <p className={`text-xl font-bold mt-1 ${invoice.balance_due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatINR(invoice.balance_due)}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Due: {formatDate(invoice.due_date)}</p>
        </div>
      </div>

      {/* Payment History & Settlement Details */}
      <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Payment History</h2>
          {!isPaid && (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="text-xs text-stone-800 hover:text-stone-950 font-bold"
            >
              + Record Payment
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <p className="text-xs text-stone-400 py-3 text-center">No payment entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-semibold">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Transaction Reference</th>
                  <th className="py-2 px-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 text-stone-800 font-medium">{formatDate(p.payment_date)}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{formatINR(p.amount)}</td>
                    <td className="py-2.5 px-3 text-stone-600 uppercase font-mono text-[11px]">{p.payment_method}</td>
                    <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">{p.transaction_reference || '—'}</td>
                    <td className="py-2.5 px-3 text-stone-500">{p.recorded_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Paper Document Preview */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-8 max-w-3xl mx-auto space-y-8 font-sans">
        {/* Invoice Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/logos/advaita-logo.png"
              alt="Advaita Designs"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">ADVAITA DESIGNS</h2>
              <p className="text-[11px] text-stone-500">Design Studio & Digital Architecture</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">INVOICE</span>
            <p className="font-mono text-sm font-bold text-stone-900 mt-0.5">{invoice.invoice_number}</p>
            <p className="text-[10px] text-stone-500">Issue Date: {formatDate(invoice.issue_date)}</p>
            <p className="text-[10px] font-semibold text-rose-700">Due Date: {formatDate(invoice.due_date)}</p>
          </div>
        </div>

        {/* Client & Project Info */}
        <div className="grid grid-cols-2 gap-4 text-xs border-b border-stone-100 pb-6">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Billed To</span>
            <p className="font-bold text-stone-900 mt-1">{invoice.client_name}</p>
            <p className="text-stone-500">{invoice.client_email}</p>
            {invoice.client_address && <p className="text-stone-400 mt-0.5">{invoice.client_address}</p>}
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Engagement Reference</span>
            <p className="font-bold text-stone-900 mt-1">{invoice.project_name}</p>
            <p className="text-stone-500">Agreement Ref: {invoice.agreement_number}</p>
            <p className="text-stone-400">Proposal Ref: {invoice.proposal_number}</p>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-[11px]">
                <th className="py-2.5 px-4">Item & Description</th>
                <th className="py-2.5 px-4 text-center">Qty</th>
                <th className="py-2.5 px-4 text-right">Rate</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-2.5 px-4 font-medium text-stone-800">{item.description}</td>
                  <td className="py-2.5 px-4 text-center text-stone-600">{item.quantity} {item.unit}</td>
                  <td className="py-2.5 px-4 text-right text-stone-600">{formatINR(item.rate)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-stone-900">{formatINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-4 max-w-xs ml-auto space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal:</span>
              <span className="font-medium text-stone-800">{formatINR(invoice.subtotal)}</span>
            </div>
            {invoice.discounts > 0 && (
              <div className="flex justify-between text-stone-500">
                <span>Discount:</span>
                <span className="font-medium text-stone-800">-{formatINR(invoice.discounts)}</span>
              </div>
            )}
            {invoice.tax_enabled === 1 && (
              <div className="flex justify-between text-stone-500">
                <span>GST ({invoice.tax_rate}%):</span>
                <span className="font-medium text-stone-800">{formatINR(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
              <span>Total Payable:</span>
              <span>{formatINR(invoice.total_payable)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Amount Paid:</span>
                <span>-{formatINR(invoice.amount_paid)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-stone-950 pt-2 border-t border-stone-200">
              <span>Balance Due:</span>
              <span className={invoice.balance_due > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                {formatINR(invoice.balance_due)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Details & UPI QR Code */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-stone-900 uppercase text-[10px] tracking-wider mb-1">Payment Instructions</h4>
            <p className="text-stone-700">Bank: <strong>HDFC Bank</strong> | A/C: <strong>50200012345678</strong></p>
            <p className="text-stone-700">IFSC: <strong>HDFC0001234</strong> | Branch: <strong>Chennai</strong></p>
            <p className="text-stone-700">UPI ID: <strong className="font-mono text-stone-900">advaita@okhdfcbank</strong></p>
          </div>
          {upiQrUrl && invoice.balance_due > 0 && (
            <div className="text-center shrink-0">
              <img src={upiQrUrl} alt="UPI QR Code" className="w-24 h-24 rounded-lg border border-stone-200 shadow-2xs" />
              <p className="text-[10px] text-stone-500 font-semibold mt-1">Scan & Pay via UPI</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-stone-100 text-center text-[10px] text-stone-400">
          Advaita Designs — Thank you for your partnership!
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Payment Settlement"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {payError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {payError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Payment Amount (INR) *
            </label>
            <input
              type="number"
              required
              max={invoice.balance_due}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
            <p className="text-[11px] text-stone-400 mt-1">Outstanding Balance: {formatINR(invoice.balance_due)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition bg-white"
              >
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="gateway">Payment Gateway</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Transaction Reference / UTR
            </label>
            <input
              type="text"
              placeholder="e.g. UPI/6291039103 or NEFT/HDFC/992019"
              value={paymentForm.transaction_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Settlement notes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={payLoading}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition"
            >
              {payLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
