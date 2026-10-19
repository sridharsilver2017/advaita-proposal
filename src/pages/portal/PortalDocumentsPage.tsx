// src/pages/portal/PortalDocumentsPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Files, Download, FileText, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatDate } from '../../lib/formatters';

export const PortalDocumentsPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const res = await apiRequest(`/api/portal/${token}`);
      if (res.success) {
        setData(res.portal);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading documents...</div>;
  }

  const proposal = data?.proposal;
  const agreement = data?.agreement;
  const invoices = data?.invoices || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Engagement Documents</h1>
        <p className="text-xs text-stone-500 mt-0.5">Download digitally sealed PDF copies of your proposals, agreements, and invoices</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="divide-y divide-stone-100">
          {/* Proposal Document */}
          {proposal && (
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50/50 transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    Project Proposal — {proposal.number} (v{proposal.version})
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Status: <span className="capitalize font-medium text-stone-600">{proposal.status}</span>
                  </p>
                </div>
              </div>
              <a
                href={`/api/documents/download/proposals/${proposal.number}_v${proposal.version}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </div>
          )}

          {/* Agreement Document */}
          {agreement && (
            <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50/50 transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    Mutual Service Agreement — {agreement.agreement_number}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Status: <span className="capitalize font-medium text-stone-600">{agreement.status.replace(/_/g, ' ')}</span>
                  </p>
                </div>
              </div>
              {agreement.status === 'executed' ? (
                <a
                  href={`/api/documents/download/agreements/${agreement.agreement_number}_executed.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Executed Agreement PDF
                </a>
              ) : (
                <span className="text-xs text-stone-400 italic">Available upon final execution</span>
              )}
            </div>
          )}

          {/* Invoices */}
          {invoices.map((inv: any) => (
            <div key={inv.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50/50 transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    Tax / Milestone Invoice — {inv.invoice_number}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Issued: {formatDate(inv.issue_date)} • Due: {formatDate(inv.due_date)}
                  </p>
                </div>
              </div>
              <a
                href={`/api/documents/download/invoices/${inv.invoice_number}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                Invoice PDF
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
