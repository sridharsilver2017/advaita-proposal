// src/lib/formatters.ts

export function formatINR(amount: number | string | undefined | null): string {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; color: string; bg: string; border: string }> = {
    // Proposals
    draft: { label: 'Draft', color: 'text-stone-700', bg: 'bg-stone-100', border: 'border-stone-200' },
    ready_to_send: { label: 'Ready to Send', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    sent: { label: 'Sent', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
    viewed: { label: 'Viewed', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    declined: { label: 'Declined', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    expired: { label: 'Expired', color: 'text-stone-500', bg: 'bg-stone-100', border: 'border-stone-200' },
    withdrawn: { label: 'Withdrawn', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    superseded: { label: 'Superseded', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },

    // Agreements
    sent_for_signature: { label: 'Sent for Signature', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
    partially_signed: { label: 'Partially Signed', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    fully_signed: { label: 'Fully Signed', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
    executed: { label: 'Executed', color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-300' },
    cancelled: { label: 'Cancelled', color: 'text-stone-500', bg: 'bg-stone-100', border: 'border-stone-200' },

    // Invoices
    issued: { label: 'Issued', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    partially_paid: { label: 'Partially Paid', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    paid: { label: 'Paid in Full', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    overdue: { label: 'Overdue', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    adjusted: { label: 'Adjusted', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },

    // Projects
    lead: { label: 'Lead', color: 'text-stone-700', bg: 'bg-stone-100', border: 'border-stone-200' },
    proposal_preparation: { label: 'Proposal Prep', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    proposal_sent: { label: 'Proposal Sent', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
    awaiting_approval: { label: 'Awaiting Approval', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    agreement_pending: { label: 'Agreement Pending', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    ready_to_start: { label: 'Ready to Start', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
    in_progress: { label: 'In Progress', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    on_hold: { label: 'On Hold', color: 'text-stone-600', bg: 'bg-stone-200', border: 'border-stone-300' },
    completed: { label: 'Completed', color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-300' }
  };

  return configs[status] || {
    label: status.replace(/_/g, ' '),
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    border: 'border-stone-200'
  };
}
