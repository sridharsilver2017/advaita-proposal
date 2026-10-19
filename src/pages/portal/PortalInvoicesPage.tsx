// src/pages/portal/PortalInvoicesPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Receipt, QrCode, Building, CheckCircle2, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDate } from '../../lib/formatters';

export const PortalInvoicesPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const res = await apiRequest(`/api/portal/${token}`);
      if (res.success) {
        setData(res.portal);
        if (res.portal.invoices && res.portal.invoices.length > 0) {
          selectInvoice(res.portal.invoices[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function selectInvoice(inv: any) {
    setSelectedInvoice(inv);
    if (inv && inv.balance_due > 0) {
      const upiString = `upi://pay?pa=advaita@okhdfcbank&pn=Advaita%20Designs&am=${inv.balance_due}&cu=INR&tn=Invoice%20${inv.invoice_number}`;
      QRCode.toDataURL(upiString, { width: 180, margin: 1 }, (err, url) => {
        if (!err) setUpiQrUrl(url);
      });
    } else {
      setUpiQrUrl(null);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading invoices...</div>;
  }

  const invoices = data?.invoices || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Invoices & Settlement</h1>
        <p className="text-xs text-stone-500 mt-0.5">View issued invoices and bank transfer / UPI payment instructions</p>
      </div>

      {invoices.length === 0 ? (
        <div className="p-12 max-w-lg mx-auto bg-white rounded-2xl border border-stone-200 text-center space-y-3">
          <Receipt className="w-8 h-8 text-stone-300 mx-auto" />
          <h2 className="text-sm font-bold text-stone-900">No Invoices Issued Yet</h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            In accordance with workflow rules, milestone invoices are issued only after the Mutual Service Agreement has been signed and executed by both parties.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Invoices List */}
          <div className="space-y-3">
            {invoices.map((inv: any) => {
              const isSelected = selectedInvoice?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => selectInvoice(inv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition shadow-2xs ${
                    isSelected
                      ? 'border-stone-900 bg-white ring-2 ring-stone-900/5'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-stone-900">{inv.invoice_number}</span>
                    <StatusBadge status={inv.status} size="sm" />
                  </div>
                  <p className="text-base font-bold text-stone-900">{formatINR(inv.total_payable)}</p>
                  <p className="text-[11px] text-stone-500 mt-1">Due: {formatDate(inv.due_date)}</p>
                  {inv.balance_due > 0 ? (
                    <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
                      Balance Due: {formatINR(inv.balance_due)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Settled in Full
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Invoice Details & Payment Instructions */}
          {selectedInvoice && (
            <div className="md:col-span-2 p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">INVOICE DETAILS</span>
                  <h2 className="text-sm font-bold text-stone-900">{selectedInvoice.invoice_number}</h2>
                </div>
                <StatusBadge status={selectedInvoice.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase">Issue Date</span>
                  <p className="font-medium text-stone-800">{formatDate(selectedInvoice.issue_date)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase">Due Date</span>
                  <p className="font-medium text-rose-700">{formatDate(selectedInvoice.due_date)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase">Total Payable</span>
                  <p className="text-lg font-bold text-stone-900">{formatINR(selectedInvoice.total_payable)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase">Outstanding Balance</span>
                  <p className={`text-lg font-bold ${selectedInvoice.balance_due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatINR(selectedInvoice.balance_due)}
                  </p>
                </div>
              </div>

              {/* Payment Settlement Methods */}
              {selectedInvoice.balance_due > 0 && (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs space-y-1.5">
                    <h3 className="font-bold text-stone-900 uppercase text-[10px] tracking-wider mb-1">
                      Bank Settlement Details
                    </h3>
                    <p className="text-stone-700">Bank: <strong>HDFC Bank</strong> | A/C: <strong>50200012345678</strong></p>
                    <p className="text-stone-700">IFSC: <strong>HDFC0001234</strong> | Branch: <strong>Chennai</strong></p>
                    <p className="text-stone-700">UPI ID: <strong className="font-mono text-stone-900">advaita@okhdfcbank</strong></p>
                    <p className="text-[11px] text-stone-500 pt-1">
                      Please include Invoice #<strong>{selectedInvoice.invoice_number}</strong> in the payment narration.
                    </p>
                  </div>
                  {upiQrUrl && (
                    <div className="text-center shrink-0">
                      <img src={upiQrUrl} alt="UPI QR Code" className="w-24 h-24 rounded-lg border border-stone-200 shadow-2xs" />
                      <p className="text-[10px] text-stone-500 font-bold mt-1">Instant UPI Scan</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
