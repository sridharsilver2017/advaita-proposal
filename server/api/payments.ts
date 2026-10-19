// server/api/payments.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { authMiddleware } from '../auth/middleware';
import { AppEnv } from '../types';

export const paymentsApp = new Hono<AppEnv>();
paymentsApp.use('*', authMiddleware);

paymentsApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const clientId = c.req.query('client_id');
  const invoiceId = c.req.query('invoice_id');

  let query = `
    SELECT p.*, inv.invoice_number, inv.total_payable, c.name as client_name, pr.name as project_name
    FROM payments p
    JOIN invoices inv ON p.invoice_id = inv.id
    JOIN clients c ON p.client_id = c.id
    JOIN projects pr ON p.project_id = pr.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (clientId) {
    query += ` AND p.client_id = ?`;
    params.push(clientId);
  }
  if (invoiceId) {
    query += ` AND p.invoice_id = ?`;
    params.push(invoiceId);
  }

  query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;
  const result = await db.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, payments: result.results });
});
