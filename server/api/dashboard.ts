// server/api/dashboard.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { authMiddleware } from '../auth/middleware';
import { AppEnv } from '../types';

export const dashboardApp = new Hono<AppEnv>();
dashboardApp.use('*', authMiddleware);

dashboardApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const today = new Date().toISOString().split('T')[0];

  // 1. Total Active Clients
  const activeClientsRow = await db.prepare(`SELECT COUNT(*) as count FROM clients WHERE status = 'active'`).first<{ count: number }>();

  // 2. Active Projects
  const activeProjectsRow = await db.prepare(`SELECT COUNT(*) as count FROM projects WHERE status NOT IN ('completed', 'cancelled')`).first<{ count: number }>();

  // 3. Proposals Awaiting Response
  const awaitingProposalsRow = await db.prepare(`SELECT COUNT(*) as count FROM proposals WHERE status IN ('sent', 'viewed')`).first<{ count: number }>();

  // 4. Accepted Proposals Awaiting Agreements
  const acceptedProposalsRow = await db.prepare(`
    SELECT COUNT(*) as count FROM proposals pr
    WHERE pr.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM agreements a WHERE a.proposal_id = pr.id AND a.status NOT IN ('declined', 'cancelled')
    )
  `).first<{ count: number }>();

  // 5. Agreements Awaiting Signatures
  const awaitingAgreementsRow = await db.prepare(`
    SELECT COUNT(*) as count FROM agreements WHERE status IN ('sent_for_signature', 'partially_signed')
  `).first<{ count: number }>();

  // 6. Fully Signed / Executed Agreements Awaiting Invoicing
  const awaitingInvoicesRow = await db.prepare(`
    SELECT COUNT(*) as count FROM agreements a
    WHERE a.status IN ('fully_signed', 'executed')
    AND NOT EXISTS (
      SELECT 1 FROM invoices inv WHERE inv.agreement_id = a.id AND inv.status != 'cancelled'
    )
  `).first<{ count: number }>();

  // 7. Outstanding Invoices & Amount
  const outstandingInvoicesRow = await db.prepare(`
    SELECT COUNT(*) as count, SUM(balance_due) as total_outstanding
    FROM invoices WHERE status IN ('issued', 'partially_paid', 'overdue')
  `).first<{ count: number; total_outstanding: number }>();

  // 8. Overdue Invoices
  const overdueInvoicesRow = await db.prepare(`
    SELECT COUNT(*) as count, SUM(balance_due) as total_overdue
    FROM invoices WHERE due_date < ? AND balance_due > 0 AND status NOT IN ('cancelled', 'paid')
  `).bind(today).first<{ count: number; total_overdue: number }>();

  // 9. Total Payments Received
  const paymentsReceivedRow = await db.prepare(`SELECT SUM(amount) as total FROM payments`).first<{ total: number }>();

  // 10. Recent Activity (audit logs)
  const recentLogs = await db.prepare(`
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10
  `).all<any>();

  // 11. Pending Action Items
  const pendingActions: any[] = [];

  // Accepted proposals needing agreements
  const needAgreementProposals = await db.prepare(`
    SELECT pr.id, pr.proposal_number, pr.title, c.name as client_name
    FROM proposals pr
    JOIN clients c ON pr.client_id = c.id
    WHERE pr.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM agreements a WHERE a.proposal_id = pr.id AND a.status NOT IN ('declined', 'cancelled')
    )
    LIMIT 5
  `).all<any>();
  for (const p of needAgreementProposals.results) {
    pendingActions.push({
      type: 'create_agreement',
      title: `Generate Agreement for ${p.client_name}`,
      subtitle: `Proposal ${p.proposal_number} was accepted.`,
      link: `/proposals/${p.id}`,
      badge: 'Action Required',
      priority: 'high'
    });
  }

  // Agreements ready for invoice
  const readyForInvoiceAgreements = await db.prepare(`
    SELECT a.id, a.agreement_number, c.name as client_name, p.name as project_name
    FROM agreements a
    JOIN clients c ON a.client_id = c.id
    JOIN projects p ON a.project_id = p.id
    WHERE a.status = 'executed'
    AND NOT EXISTS (
      SELECT 1 FROM invoices inv WHERE inv.agreement_id = a.id AND inv.status != 'cancelled'
    )
    LIMIT 5
  `).all<any>();
  for (const a of readyForInvoiceAgreements.results) {
    pendingActions.push({
      type: 'generate_invoice',
      title: `Generate Invoice for ${a.client_name}`,
      subtitle: `Agreement ${a.agreement_number} executed.`,
      link: `/agreements/${a.id}`,
      badge: 'Ready to Invoice',
      priority: 'high'
    });
  }

  // Agreements needing freelancer signature
  const needMySignature = await db.prepare(`
    SELECT a.id, a.agreement_number, c.name as client_name
    FROM agreements a
    JOIN clients c ON a.client_id = c.id
    JOIN agreement_signers asg ON a.id = asg.agreement_id
    WHERE a.status IN ('sent_for_signature', 'partially_signed')
    AND asg.role = 'freelancer' AND asg.status = 'pending'
    LIMIT 5
  `).all<any>();
  for (const a of needMySignature.results) {
    pendingActions.push({
      type: 'sign_agreement',
      title: `Sign Agreement ${a.agreement_number}`,
      subtitle: `Your signature is pending for ${a.client_name}.`,
      link: `/agreements/${a.id}`,
      badge: 'Signature Pending',
      priority: 'urgent'
    });
  }

  return c.json({
    success: true,
    stats: {
      activeClients: activeClientsRow?.count || 0,
      activeProjects: activeProjectsRow?.count || 0,
      proposalsAwaitingResponse: awaitingProposalsRow?.count || 0,
      acceptedAwaitingAgreements: acceptedProposalsRow?.count || 0,
      agreementsAwaitingSignatures: awaitingAgreementsRow?.count || 0,
      agreementsAwaitingInvoicing: awaitingInvoicesRow?.count || 0,
      outstandingInvoices: outstandingInvoicesRow?.count || 0,
      outstandingAmount: outstandingInvoicesRow?.total_outstanding || 0,
      overdueInvoices: overdueInvoicesRow?.count || 0,
      overdueAmount: overdueInvoicesRow?.total_overdue || 0,
      totalPaymentsReceived: paymentsReceivedRow?.total || 0
    },
    pendingActions,
    recentActivity: recentLogs.results
  });
});
