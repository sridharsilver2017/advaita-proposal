// src/pages/admin/AgreementDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileSignature,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Receipt,
  Upload,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { SignaturePad } from '../../components/signature/SignaturePad';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';

export const AgreementDetailPage: React.FC = () => {
  const { agreementId } = useParams<{ agreementId: string }>();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isPhysicalModalOpen, setIsPhysicalModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Physical signing form state
  const [physicalForm, setPhysicalForm] = useState({
    physical_signed_date: new Date().toISOString().split('T')[0],
    client_signer_name: '',
    freelancer_signer_name: 'Advaita Designs Admin',
    notes: 'In-person physical paper execution with verified client signatures.',
    file_base64: ''
  });

  useEffect(() => {
    loadAgreement();
  }, [agreementId]);

  async function loadAgreement() {
    try {
      const res = await apiRequest(`/api/agreements/${agreementId}`);
      if (res.success) {
        setAgreement(res.agreement);
        if (res.agreement.client_name && !physicalForm.client_signer_name) {
          setPhysicalForm(prev => ({ ...prev, client_signer_name: res.agreement.client_name }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendForSignature() {
    try {
      const res = await apiRequest(`/api/agreements/${agreementId}/send`, { method: 'POST' });
      if (res.success) {
        setActionSuccess('Agreement sent for signature. Client can now sign online.');
        loadAgreement();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send agreement');
    }
  }

  async function handleFreelancerSign(data: {
    signerName: string;
    signingMethod: 'drawn' | 'typed' | 'uploaded';
    signatureData: string;
    consentText: string;
  }) {
    try {
      const res = await apiRequest(`/api/agreements/${agreementId}/sign`, {
        method: 'POST',
        body: JSON.stringify({
          signer_name: data.signerName,
          signing_method: data.signingMethod,
          signature_data: data.signatureData,
          consent_text: data.consentText
        })
      });
      if (res.success) {
        setIsSignModalOpen(false);
        setActionSuccess(res.message);
        loadAgreement();
      }
    } catch (err: any) {
      alert(err.message || 'Signing failed');
    }
  }

  async function handlePhysicalUpload(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiRequest(`/api/agreements/${agreementId}/upload-signed-copy`, {
        method: 'POST',
        body: JSON.stringify(physicalForm)
      });
      if (res.success) {
        setIsPhysicalModalOpen(false);
        setActionSuccess(res.message);
        loadAgreement();
      }
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  }

  async function handleFinalize() {
    setIsFinalizing(true);
    try {
      const res = await apiRequest(`/api/agreements/${agreementId}/finalize`, { method: 'POST' });
      if (res.success) {
        setActionSuccess('Agreement officially executed and sealed! Invoicing is now unlocked.');
        loadAgreement();
      }
    } catch (err: any) {
      alert(err.message || 'Finalization failed');
    } finally {
      setIsFinalizing(false);
    }
  }

  function copyPortalSignLink() {
    if (!agreement?.portal_token) return;
    const url = `${window.location.origin}/portal/${agreement.portal_token}/sign`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading agreement...</div>;
  }
  if (!agreement) {
    return <div className="p-8 text-center text-xs text-rose-500">Agreement not found.</div>;
  }

  const details = agreement.details || {};
  const signers = agreement.signers || [];
  const clientSigner = signers.find((s: any) => s.role === 'client');
  const freelancerSigner = signers.find((s: any) => s.role === 'freelancer');
  const isDraft = agreement.status === 'draft';
  const isFullySigned = agreement.status === 'fully_signed';
  const isExecuted = agreement.status === 'executed';
  const isPartiallySigned = agreement.status === 'partially_signed';

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/agreements"
            className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-stone-900">{agreement.agreement_number}</span>
              <span className="text-xs text-stone-400 font-medium">(v{agreement.current_version})</span>
              <StatusBadge status={agreement.status} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-stone-900">
              Mutual Agreement: {agreement.client_name}
            </h1>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {agreement.portal_token && (
            <button
              onClick={copyPortalSignLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-xl transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Sign Link Copied!' : 'Copy Client Sign Link'}
            </button>
          )}

          {isDraft && (
            <button
              onClick={handleSendForSignature}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              Send for Signature
            </button>
          )}

          {/* Designer Signature action if not signed */}
          {freelancerSigner?.status !== 'signed' && !isExecuted && (
            <button
              onClick={() => setIsSignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <FileSignature className="w-3.5 h-3.5" />
              Sign as Designer
            </button>
          )}

          {/* Physical upload action */}
          {!isExecuted && (
            <button
              onClick={() => setIsPhysicalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-xl transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Physical Signing Upload
            </button>
          )}

          {/* Finalize action when both parties signed */}
          {isFullySigned && !isExecuted && (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isFinalizing ? 'Sealing & Finalizing...' : 'Finalize & Mark Executed'}
            </button>
          )}

          {/* CRITICAL PRECONDITION: Invoicing unlocked ONLY when agreement is executed! */}
          {isExecuted && (
            <Link
              to={`/invoices?agreement_id=${agreement.id}&action=generate`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/invoices`, { state: { openGenerateFor: agreement } });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <Receipt className="w-3.5 h-3.5" />
              Generate Invoice
            </Link>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Dual Signature Execution Status Card */}
      <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Dual Signature Execution Status</h2>
            <p className="text-[11px] text-stone-500">Both parties must complete digital or physical execution before an invoice can be created.</p>
          </div>
          <span className="text-[11px] font-bold text-stone-500">
            {isExecuted ? 'Execution Verified' : isFullySigned ? 'Ready for Execution' : 'Signatures Pending'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Client Signer Status */}
          <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/60 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Party 1: Client</span>
              <p className="font-bold text-xs text-stone-900 mt-0.5">{clientSigner?.signer_name || agreement.client_name}</p>
              <p className="text-[11px] text-stone-500">{clientSigner?.signer_email}</p>
              {clientSigner?.status === 'signed' ? (
                <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Signed on {formatDateTime(clientSigner.signed_at)}
                </p>
              ) : (
                <p className="text-[10px] text-amber-700 font-semibold mt-1">Pending Client Signature</p>
              )}
            </div>
            <StatusBadge status={clientSigner?.status === 'signed' ? 'accepted' : 'draft'} size="sm" />
          </div>

          {/* Designer Signer Status */}
          <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/60 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Party 2: Advaita Designs</span>
              <p className="font-bold text-xs text-stone-900 mt-0.5">{freelancerSigner?.signer_name || 'Advaita Designs Admin'}</p>
              <p className="text-[11px] text-stone-500">{freelancerSigner?.signer_email || 'admin@advaitadesigns.com'}</p>
              {freelancerSigner?.status === 'signed' ? (
                <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Signed on {formatDateTime(freelancerSigner.signed_at)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(true)}
                  className="mt-1 text-[11px] text-stone-900 font-bold hover:underline"
                >
                  Click to Sign Now →
                </button>
              )}
            </div>
            <StatusBadge status={freelancerSigner?.status === 'signed' ? 'accepted' : 'draft'} size="sm" />
          </div>
        </div>

        {/* Execution Notice */}
        {isExecuted && (
          <div className="pt-2 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Agreement fully executed on {formatDateTime(agreement.executed_at)}. Cryptographic tamper-evident hash stamped. Invoice generation is enabled.
            </span>
          </div>
        )}
      </div>

      {/* Agreement Terms Preview Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-8 max-w-3xl mx-auto space-y-8 font-sans">
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
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">AGREEMENT REF</span>
            <p className="font-mono text-xs font-bold text-stone-900 mt-0.5">{agreement.agreement_number}</p>
            <p className="text-[10px] text-stone-400">Proposal Ref: {agreement.proposal_number}</p>
          </div>
        </div>

        <div className="text-xs space-y-4 leading-relaxed text-stone-800">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
            <p className="font-bold text-stone-900 mb-1">PARTIES TO THIS AGREEMENT:</p>
            <p>1. <strong>Advaita Designs</strong> ("Designer", Chennai, India)</p>
            <p>2. <strong>{agreement.client_name}</strong> ("Client", {agreement.client_email})</p>
            <p className="mt-1 text-stone-500">Effective Date: {details.effective_date || formatDate(agreement.created_at)}</p>
          </div>

          <div>
            <h3 className="font-bold text-stone-900 uppercase text-xs tracking-wider mb-1">1. Scope of Work & Deliverables</h3>
            <p className="text-stone-700 whitespace-pre-line">{details.scope_of_work}</p>
            <p className="text-stone-700 whitespace-pre-line mt-2">{details.deliverables}</p>
          </div>

          <div>
            <h3 className="font-bold text-stone-900 uppercase text-xs tracking-wider mb-1">2. Compensation & Milestones</h3>
            <p className="text-stone-700">Total Agreed Contract Sum: <strong>{formatINR(details.price)}</strong></p>
            <p className="text-stone-700 mt-1">{details.payment_milestones}</p>
          </div>

          <div>
            <h3 className="font-bold text-stone-900 uppercase text-xs tracking-wider mb-1">3. Terms & Conditions</h3>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 whitespace-pre-line text-[11px] text-stone-600 leading-relaxed font-mono">
              {details.legal_terms}
            </div>
          </div>
        </div>
      </div>

      {/* Freelancer Sign Modal */}
      <Modal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        title="Countersign Agreement as Designer"
      >
        <SignaturePad
          defaultName={freelancerSigner?.signer_name || 'Advaita Designs (Admin)'}
          onSign={handleFreelancerSign}
        />
      </Modal>

      {/* Physical Signing Upload Modal */}
      <Modal
        isOpen={isPhysicalModalOpen}
        onClose={() => setIsPhysicalModalOpen(false)}
        title="Upload Physically Signed Agreement"
      >
        <form onSubmit={handlePhysicalUpload} className="space-y-4">
          <p className="text-xs text-stone-500">
            For local/in-person engagements where both parties executed a printed physical agreement.
          </p>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Physical Signing Date *
            </label>
            <input
              type="date"
              required
              value={physicalForm.physical_signed_date}
              onChange={(e) => setPhysicalForm({ ...physicalForm, physical_signed_date: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Client Signatory Legal Name *
            </label>
            <input
              type="text"
              required
              value={physicalForm.client_signer_name}
              onChange={(e) => setPhysicalForm({ ...physicalForm, client_signer_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Advaita Designs Signatory Legal Name *
            </label>
            <input
              type="text"
              required
              value={physicalForm.freelancer_signer_name}
              onChange={(e) => setPhysicalForm({ ...physicalForm, freelancer_signer_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Verification Notes
            </label>
            <textarea
              rows={2}
              value={physicalForm.notes}
              onChange={(e) => setPhysicalForm({ ...physicalForm, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsPhysicalModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition"
            >
              Confirm & Upload
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
