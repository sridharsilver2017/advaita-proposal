// server/api/reports.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { authMiddleware } from '../auth/middleware';
import { AppEnv } from '../types';

export const reportsApp = new Hono<AppEnv>();
reportsApp.use('*', authMiddleware);

reportsApp.get('/summary', async (c) => {
  const db = getDatabase(c.env);

  // Proposal acceptance rate
  const totalProps = await db.prepare(`SELECT COUNT(*) as count FROM proposals WHERE status NOT IN ('draft', 'ready_to_send')`).first<{ count: number }>();
  const acceptedProps = await db.prepare(`SELECT COUNT(*) as count FROM proposals WHERE status = 'accepted'`).first<{ count: number }>();
  const acceptanceRate = totalProps?.count ? Math.round(((acceptedProps?.count || 0) / totalProps.count) * 100) : 0;

  // Invoicing and Revenue metrics
  const invoicedRow = await db.prepare(`SELECT SUM(total_payable) as total FROM invoices WHERE status != 'cancelled'`).first<{ total: number }>();
  const collectedRow = await db.prepare(`SELECT SUM(amount) as total FROM payments`).first<{ total: number }>();
  const outstandingRow = await db.prepare(`SELECT SUM(balance_due) as total FROM invoices WHERE status IN ('issued', 'partially_paid', 'overdue')`).first<{ total: number }>();

  // Client-wise project value
  const clientBreakdown = await db.prepare(`
    SELECT c.name as client_name, COUNT(DISTINCT p.id) as project_count,
           COALESCE(SUM(inv.total_payable), 0) as total_invoiced,
           COALESCE(SUM(inv.amount_paid), 0) as total_collected
    FROM clients c
    LEFT JOIN projects p ON c.id = p.client_id
    LEFT JOIN invoices inv ON p.id = inv.project_id AND inv.status != 'cancelled'
    GROUP BY c.id
    ORDER BY total_invoiced DESC
  `).all<any>();

  return c.json({
    success: true,
    summary: {
      totalProposalsSent: totalProps?.count || 0,
      totalProposalsAccepted: acceptedProps?.count || 0,
      acceptanceRate,
      totalInvoiced: invoicedRow?.total || 0,
      totalCollected: collectedRow?.total || 0,
      totalOutstanding: outstandingRow?.total || 0,
      clientBreakdown: clientBreakdown.results
    }
  });
});

reportsApp.get('/export-invoices-csv', async (c) => {
  const db = getDatabase(c.env);
  const rows = await db.prepare(`
    SELECT inv.invoice_number, c.name as client_name, p.name as project_name,
           inv.issue_date, inv.due_date, inv.status, inv.total_payable, inv.amount_paid, inv.balance_due
    FROM invoices inv
    JOIN clients c ON inv.client_id = c.id
    JOIN projects p ON inv.project_id = p.id
    ORDER BY inv.issue_date DESC
  `).all<any>();

  let csv = 'Invoice Number,Client Name,Project Name,Issue Date,Due Date,Status,Total Payable,Amount Paid,Balance Due\n';
  for (const r of rows.results) {
    csv += `"${r.invoice_number}","${r.client_name}","${r.project_name}","${r.issue_date}","${r.due_date}","${r.status}",${r.total_payable},${r.amount_paid},${r.balance_due}\n`;
  }

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="invoices_report.csv"');
  return c.body(csv);
});
