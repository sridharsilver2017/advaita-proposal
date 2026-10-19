// src/pages/portal/PortalAgreementPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileSignature,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';

export const PortalAgreementPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const res = await apiRequest(`/api/portal/${token}`);
      if (res.success) {
        setData(res.portal);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agreement');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-stone-400 text-sm">Loading agreement...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white rounded-2xl border border-stone-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-stone-900">Portal Access Restricted</h2>
        <p className="text-xs text-stone-600 leading-relaxed">{error}</p>
      </div>
    );
  }

  const { agreement, proposal, client, business } = data;

  if (!agreement) {
    return (
      <div className="p-12 max-w-lg mx-auto bg-white rounded-2xl border border-stone-200 text-center space-y-3">
        <Clock className="w-8 h-8 text-stone-300 mx-auto" />
        <h2 className="text-base font-bold text-stone-900">Agreement in Preparation</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          {proposal.status === 'accepted'
            ? 'Advaita Designs has been notified of your proposal acceptance and is generating your Mutual Service Agreement.'
            : 'Please review and accept the Project Proposal first before the agreement can be drafted.'}
        </p>
        <Link
          to={`/portal/${token}/proposal`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          View Proposal
        </Link>
      </div>
    );
  }

  const signers = agreement.signers || [];
  const clientSigner = signers.find((s: any) => s.role === 'client');
  const freelancerSigner = signers.find((s: any) => s.role === 'freelancer');
  const isClientSigned = clientSigner?.status === 'signed';
  const isFullyExecuted = agreement.status === 'executed';
  const details = agreement.details || {};

  return (
    <div className="space-y-6">
      {/* Signature CTA Banner */}
      {!isClientSigned && ['sent_for_signature', 'partially_signed'].includes(agreement.status) && (
        <div className="p-4 bg-stone-900 text-white rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-sm font-bold">Mutual Agreement Ready for Signature</h2>
            <p className="text-xs text-stone-300 mt-0.5">
              Please review the terms below and execute your digital signature.
            </p>
          </div>
          <button
            onClick={() => navigate(`/portal/${token}/sign`)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold rounded-xl shadow-xs transition shrink-0"
          >
            <FileSignature className="w-3.5 h-3.5" />
            Sign Agreement Now
          </button>
        </div>
      )}

      {/* Execution Callout */}
      {isFullyExecuted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-950">Agreement Fully Executed & Sealed</p>
              <p className="text-[11px] text-emerald-800">
                Both parties have completed signatures. This agreement is legally binding under applicable electronic records law.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/portal/${token}/invoices`)}
            className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-lg transition"
          >
            View Invoices
          </button>
        </div>
      )}

      {/* Signer Status Progress */}
      <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Execution Signatures
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase">Client Signatory</span>
              <p className="font-bold text-stone-900 mt-0.5">{clientSigner?.signer_name || client.name}</p>
              <p className="text-[11px] text-stone-500">{clientSigner?.signer_email}</p>
              {isClientSigned ? (
                <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Signed on {formatDateTime(clientSigner.signed_at)}
                </p>
              ) : (
                <p className="text-[10px] text-amber-700 font-semibold mt-1">Pending Your Signature</p>
              )}
            </div>
            <StatusBadge status={isClientSigned ? 'accepted' : 'draft'} size="sm" />
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase">Advaita Designs Signatory</span>
              <p className="font-bold text-stone-900 mt-0.5">{freelancerSigner?.signer_name || 'Advaita Designs Admin'}</p>
              <p className="text-[11px] text-stone-500">{freelancerSigner?.signer_email || 'hello@advaitadesigns.com'}</p>
              {freelancerSigner?.status === 'signed' ? (
                <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Signed on {formatDateTime(freelancerSigner.signed_at)}
                </p>
              ) : (
                <p className="text-[10px] text-stone-500 mt-1">Pending Countersignature</p>
              )}
            </div>
            <StatusBadge status={freelancerSigner?.status === 'signed' ? 'accepted' : 'draft'} size="sm" />
          </div>
        </div>
      </div>

      {/* Editorial Document Paper */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-6 sm:p-10 max-w-4xl mx-auto space-y-8 font-sans">
        <div className="flex items-start justify-between border-b border-stone-100 pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/logos/advaita-logo.png"
              alt="Advaita Designs"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">ADVAITA DESIGNS</h2>
              <p className="text-[11px] text-stone-500">Mutual Professional Services Agreement</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">AGREEMENT NUMBER</span>
            <p className="font-mono text-xs font-bold text-stone-900 mt-0.5">{agreement.agreement_number}</p>
            <p className="text-[10px] text-stone-400">Proposal Ref: {proposal.number}</p>
          </div>
        </div>

        <div className="text-xs space-y-4 leading-relaxed text-stone-800">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
            <p className="font-bold text-stone-900 mb-1">AGREEMENT DETAILS:</p>
            <p>Between <strong>Advaita Designs</strong> ("Designer") and <strong>{client.name}</strong> ("Client").</p>
            <p className="mt-1 text-stone-500">Effective Date: {details.effective_date || formatDate(agreement.created_at)}</p>
          </div>

          <div>
            <h3 className="font-bold text-stone-900 uppercase text-xs tracking-wider mb-1">1. Scope of Work & Deliverables</h3>
            <p className="text-stone-700 whitespace-pre-line">{details.scope_of_work}</p>
            <p className="text-stone-700 whitespace-pre-line mt-2">{details.deliverables}</p>
          </div>

          <div>
            <h3 className="font-bold text-stone-900 uppercase text-xs tracking-wider mb-1">2. Agreed Price & Milestones</h3>
            <p className="text-stone-700">Total Agreed Contract Sum: <strong>{formatINR(details.price)}</strong></p>
            <p className="text-stone-700 mt-1">{details.payment_milestones}</p>
          </div>

          <div>
            <h3 className="font-bold text-stone-900 uppercase text-xs tracking-wider mb-1">3. Legal Terms & Intellectual Property</h3>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 whitespace-pre-line text-[11px] text-stone-600 leading-relaxed font-mono">
              {details.legal_terms}
            </div>
          </div>
        </div>

        {!isClientSigned && ['sent_for_signature', 'partially_signed'].includes(agreement.status) && (
          <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
            <p className="text-xs text-stone-500">Ready to execute your electronic signature?</p>
            <button
              onClick={() => navigate(`/portal/${token}/sign`)}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <FileSignature className="w-3.5 h-3.5" />
              Sign Agreement
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
