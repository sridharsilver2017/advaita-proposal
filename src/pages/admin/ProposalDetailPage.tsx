// src/pages/admin/ProposalDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Copy,
  Check,
  FileSignature,
  Download,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';

export const ProposalDetailPage: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProposal();
  }, [proposalId]);

  async function loadProposal() {
    try {
      const res = await apiRequest(`/api/proposals/${proposalId}`);
      if (res.success) {
        setProposal(res.proposal);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendProposal() {
    setSending(true);
    setActionMessage(null);
    try {
      const res = await apiRequest(`/api/proposals/${proposalId}/send`, { method: 'POST' });
      if (res.success) {
        setActionMessage(res.message || 'Proposal sent successfully!');
        loadProposal();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send proposal.');
    } finally {
      setSending(false);
    }
  }

  function copyPortalUrl() {
    if (!proposal?.portal_token) return;
    const url = `${window.location.origin}/portal/${proposal.portal_token}/proposal`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleGenerateAgreement() {
    try {
      const res = await apiRequest('/api/agreements', {
        method: 'POST',
        body: JSON.stringify({
          proposal_id: proposal.id,
          signing_order: 'client_first'
        })
      });
      if (res.success) {
        navigate(`/agreements/${res.agreement.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate agreement.');
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading proposal...</div>;
  }
  if (!proposal) {
    return <div className="p-8 text-center text-xs text-rose-500">Proposal record not found.</div>;
  }

  const details = proposal.currentVersionDetails || {};
  const items = proposal.items || [];
  const acceptance = proposal.acceptance;
  const isAccepted = proposal.status === 'accepted';
  const isDeclined = proposal.status === 'declined';
  const isDraft = proposal.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/proposals"
            className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-stone-900">{proposal.proposal_number}</span>
              <span className="text-xs text-stone-400 font-medium">(v{proposal.current_version})</span>
              <StatusBadge status={proposal.status} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-stone-900">{proposal.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {proposal.portal_token && (
            <button
              onClick={copyPortalUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-xl transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Link Copied!' : 'Copy Portal Link'}
            </button>
          )}

          {isDraft && (
            <button
              onClick={handleSendProposal}
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Generating PDF & Dispatching...' : 'Send Proposal to Client'}
            </button>
          )}

          {/* Core Business Rule: Generate Agreement is unlocked ONLY after Proposal Acceptance! */}
          {isAccepted && (
            <button
              onClick={handleGenerateAgreement}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <FileSignature className="w-3.5 h-3.5" />
              Generate Mutual Agreement
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Acceptance Status Banner */}
      {isAccepted && acceptance && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Proposal Accepted by {acceptance.client_name}
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Version {acceptance.version_number} locked on {formatDateTime(acceptance.accepted_at)} ({acceptance.client_email})
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateAgreement}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-lg transition"
          >
            Create Agreement
          </button>
        </div>
      )}

      {/* Decline Status Banner */}
      {isDeclined && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-950">Proposal Declined by Client</p>
            <p className="text-[11px] text-rose-800 mt-0.5">
              Reason: {proposal.decline_reason || 'No specific feedback provided.'}
            </p>
          </div>
        </div>
      )}

      {/* Editorial Document Paper Preview */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-8 max-w-3xl mx-auto space-y-8 font-sans">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/logos/advaita-logo.png"
              alt="Advaita Designs"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">ADVAITA DESIGNS</h2>
              <p className="text-[11px] text-stone-500">Design Architecture & Brand Systems</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">PROPOSAL</span>
            <p className="font-mono text-xs font-bold text-stone-900 mt-0.5">{proposal.proposal_number}</p>
            <p className="text-[10px] text-stone-400">Valid until: {formatDate(proposal.valid_until)}</p>
          </div>
        </div>

        {/* Client & Date Information */}
        <div className="grid grid-cols-2 gap-4 text-xs border-b border-stone-100 pb-6">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Prepared For</span>
            <p className="font-bold text-stone-900 mt-1">{proposal.client_name}</p>
            <p className="text-stone-500">{proposal.client_email}</p>
            {proposal.client_address && <p className="text-stone-400 mt-0.5">{proposal.client_address}</p>}
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Project Context</span>
            <p className="font-bold text-stone-900 mt-1">{proposal.project_name}</p>
            <p className="text-stone-500">Timeline: {details.timeline}</p>
          </div>
        </div>

        {/* Proposal Title & Intro */}
        <div>
          <h3 className="text-lg font-bold text-stone-900 mb-2">{details.title}</h3>
          {details.introduction && (
            <p className="text-xs text-stone-600 leading-relaxed">{details.introduction}</p>
          )}
        </div>

        {/* Scope & Deliverables */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Scope of Work</h4>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700 whitespace-pre-line leading-relaxed">
              {details.scope_of_work}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Deliverables</h4>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700 whitespace-pre-line leading-relaxed">
              {details.deliverables}
            </div>
          </div>
        </div>

        {/* Pricing Items Table */}
        <div>
          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">Investment Details</h4>
          <div className="border border-stone-200 rounded-xl overflow-hidden">
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
                    <td className="py-2.5 px-4 text-right font-bold text-stone-900">{formatINR(item.calculated_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 max-w-xs ml-auto space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal:</span>
              <span className="font-medium text-stone-800">{formatINR(proposal.subtotal)}</span>
            </div>
            {proposal.discount > 0 && (
              <div className="flex justify-between text-stone-500">
                <span>Discount:</span>
                <span className="font-medium text-stone-800">-{formatINR(proposal.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
              <span>Total Value:</span>
              <span>{formatINR(proposal.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Schedule */}
        <div>
          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Payment Terms</h4>
          <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-100">
            {details.payment_schedule}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-stone-100 text-center text-[10px] text-stone-400">
          Advaita Designs — Confidential & Proprietary Engagement Terms
        </div>
      </div>
    </div>
  );
};
