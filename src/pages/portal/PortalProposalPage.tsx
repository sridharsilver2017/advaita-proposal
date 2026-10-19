// src/pages/portal/PortalProposalPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';

export const PortalProposalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accept modal state
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [confirmAcceptance, setConfirmAcceptance] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Decline modal state
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    loadPortalData();
  }, [token]);

  async function loadPortalData() {
    try {
      const res = await apiRequest(`/api/portal/${token}`);
      if (res.success) {
        setData(res.portal);
        setClientName(res.portal.client.name || '');
        setClientEmail(res.portal.client.email || '');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired secure portal link.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setAcceptError(null);
    setAccepting(true);

    try {
      const res = await apiRequest(`/api/portal/${token}/proposal/accept`, {
        method: 'POST',
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          confirm_acceptance: confirmAcceptance
        })
      });

      if (res.success) {
        setIsAcceptModalOpen(false);
        loadPortalData();
      }
    } catch (err: any) {
      setAcceptError(err.message || 'Acceptance failed.');
    } finally {
      setAccepting(false);
    }
  }

  async function handleDecline(e: React.FormEvent) {
    e.preventDefault();
    setDeclining(true);

    try {
      const res = await apiRequest(`/api/portal/${token}/proposal/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason: declineReason })
      });

      if (res.success) {
        setIsDeclineModalOpen(false);
        loadPortalData();
      }
    } catch (err: any) {
      alert(err.message || 'Decline failed.');
    } finally {
      setDeclining(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-stone-400 text-sm">Loading engagement documents...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white rounded-2xl border border-stone-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-stone-900">Portal Access Restricted</h2>
        <p className="text-xs text-stone-600 leading-relaxed">{error}</p>
        <p className="text-[11px] text-stone-400">
          Please contact Advaita Designs at <a href="mailto:hello@advaitadesigns.com" className="underline">hello@advaitadesigns.com</a> to request an updated access token.
        </p>
      </div>
    );
  }

  const { proposal, client, project, business, agreement } = data;
  const details = proposal.details || {};
  const items = proposal.items || [];
  const isAccepted = proposal.status === 'accepted';
  const isDeclined = proposal.status === 'declined';
  const isPendingDecision = ['sent', 'viewed'].includes(proposal.status);

  return (
    <div className="space-y-6">
      {/* Top Banner with Decision CTAs */}
      {isPendingDecision && (
        <div className="p-4 bg-stone-900 text-white rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-sm font-bold">Proposal Ready for Your Review & Approval</h2>
            <p className="text-xs text-stone-300 mt-0.5">
              Valid until {formatDate(proposal.validUntil)}. Once accepted, your mutual agreement will be prepared.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsDeclineModalOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-stone-300 hover:text-white rounded-xl border border-stone-700 hover:border-stone-500 transition"
            >
              Decline...
            </button>
            <button
              onClick={() => setIsAcceptModalOpen(true)}
              className="px-5 py-2 bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold rounded-xl shadow-xs transition"
            >
              Accept Proposal
            </button>
          </div>
        </div>
      )}

      {/* Accepted Status Callout */}
      {isAccepted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Proposal Terms Accepted by {proposal.acceptance?.client_name || client.name}
              </p>
              <p className="text-[11px] text-emerald-800">
                Sealed on {formatDateTime(proposal.acceptance?.accepted_at)}. Version {proposal.version} is locked.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/portal/${token}/agreement`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            Proceed to Mutual Agreement
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Declined Status Callout */}
      {isDeclined && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-950">Proposal Declined</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Reason provided: {proposal.decline_reason || 'No details provided.'}
            </p>
          </div>
        </div>
      )}

      {/* Editorial Document Paper */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-6 sm:p-10 max-w-4xl mx-auto space-y-8 font-sans">
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
              <p className="text-[11px] text-stone-500">{business.tagline || 'Design Architecture'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">PROPOSAL</span>
            <p className="font-mono text-xs font-bold text-stone-900 mt-0.5">{proposal.number}</p>
            <p className="text-[10px] text-stone-500">v{proposal.version} • Valid until: {formatDate(proposal.validUntil)}</p>
          </div>
        </div>

        {/* Client & Project Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-stone-100 pb-6">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Client</span>
            <p className="font-bold text-stone-900 mt-1">{client.name}</p>
            <p className="text-stone-500">{client.email}</p>
            {client.address && <p className="text-stone-400 mt-0.5">{client.address}</p>}
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Project</span>
            <p className="font-bold text-stone-900 mt-1">{project.name}</p>
            <p className="text-stone-500">Timeline: {details.timeline}</p>
          </div>
        </div>

        {/* Introduction */}
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

          {details.exclusions && (
            <div>
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Exclusions</h4>
              <p className="text-xs text-stone-500 italic bg-stone-50/50 p-3 rounded-xl border border-stone-100">
                {details.exclusions}
              </p>
            </div>
          )}
        </div>

        {/* Investment Details Table */}
        <div>
          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">Project Investment</h4>
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
              <span>Total Investment:</span>
              <span>{formatINR(proposal.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Schedule & Responsibilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Payment Milestones</h4>
            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-100">
              {details.payment_schedule}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Revision Policy</h4>
            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-100">
              {details.revision_policy || 'Two comprehensive revision iterations included.'}
            </p>
          </div>
        </div>

        {/* Action Footer */}
        {isPendingDecision && (
          <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stone-500">Ready to move forward with Advaita Designs?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDeclineModalOpen(true)}
                className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl"
              >
                Decline Proposal
              </button>
              <button
                onClick={() => setIsAcceptModalOpen(true)}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Accept Proposal & Proceed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Acceptance Modal */}
      <Modal
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        title="Confirm Proposal Acceptance"
      >
        <form onSubmit={handleAccept} className="space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">
            By accepting this proposal, you confirm your approval of the scope of work, deliverables, timeline, and investment terms ({formatINR(proposal.total)}).
          </p>

          {acceptError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {acceptError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Your Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Your Email Address *
            </label>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={confirmAcceptance}
                onChange={(e) => setConfirmAcceptance(e.target.checked)}
                className="mt-0.5 rounded text-stone-900 focus:ring-stone-900"
              />
              <span className="text-xs text-stone-700 leading-relaxed font-medium">
                I explicitly accept this proposal ({proposal.number} v{proposal.version}) and authorize Advaita Designs to generate our Mutual Service Agreement.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAcceptModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={accepting || !confirmAcceptance}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
            >
              {accepting ? 'Recording Acceptance...' : 'Confirm Acceptance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Decline Modal */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title="Decline Proposal"
      >
        <form onSubmit={handleDecline} className="space-y-4">
          <p className="text-xs text-stone-600">
            Please let Advaita Designs know why this proposal does not meet your requirements:
          </p>
          <textarea
            rows={3}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Feedback on scope, timeline, or pricing..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
          />
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsDeclineModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={declining}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition"
            >
              {declining ? 'Submitting...' : 'Confirm Decline'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
