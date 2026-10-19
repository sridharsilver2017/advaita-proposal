// server/api/clients.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { authMiddleware, recordAuditLog } from '../auth/middleware';
import { AppEnv } from '../types';

export const clientsApp = new Hono<AppEnv>();
clientsApp.use('*', authMiddleware);

clientsApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const status = c.req.query('status') || 'active';
  const search = c.req.query('search')?.trim();

  let query = `SELECT * FROM clients WHERE 1=1`;
  const params: any[] = [];

  if (status !== 'all') {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (name LIKE ? OR email LIKE ? OR contact_person LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY created_at DESC`;
  const result = await db.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, clients: result.results });
});

clientsApp.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    name,
    type = 'company',
    contact_person,
    email,
    phone,
    billing_address,
    city,
    state,
    postal_code,
    country = 'India',
    tax_id,
    notes
  } = body;

  if (!name || !email) {
    return c.json({ success: false, error: 'Client name and email are required' }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');
  const now = new Date().toISOString();
  const clientId = `cli_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Check existing active client with same email
  const existing = await db.prepare(`SELECT id FROM clients WHERE email = ? AND status = 'active'`).bind(email.toLowerCase().trim()).first();
  if (existing) {
    return c.json({ success: false, error: 'An active client with this email already exists' }, 409);
  }

  await db.prepare(`
    INSERT INTO clients (id, type, name, contact_person, email, phone, billing_address, city, state, postal_code, country, tax_id, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(
    clientId,
    type,
    name.trim(),
    contact_person?.trim() || null,
    email.toLowerCase().trim(),
    phone?.trim() || null,
    billing_address?.trim() || null,
    city?.trim() || null,
    state?.trim() || null,
    postal_code?.trim() || null,
    country.trim(),
    tax_id?.trim() || null,
    notes?.trim() || null,
    now,
    now
  ).run();

  await recordAuditLog(db, user.id, 'client_created', 'client', clientId, { name, email });

  const client = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(clientId).first();
  return c.json({ success: true, client }, 201);
});

clientsApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);

  const client = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(id).first<any>();
  if (!client) {
    return c.json({ success: false, error: 'Client not found' }, 404);
  }

  // Fetch associated records
  const projects = await db.prepare(`SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC`).bind(id).all<any>();
  const proposals = await db.prepare(`SELECT * FROM proposals WHERE client_id = ? ORDER BY created_at DESC`).bind(id).all<any>();
  const agreements = await db.prepare(`SELECT * FROM agreements WHERE client_id = ? ORDER BY created_at DESC`).bind(id).all<any>();
  const invoices = await db.prepare(`SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC`).bind(id).all<any>();
  const payments = await db.prepare(`SELECT * FROM payments WHERE client_id = ? ORDER BY payment_date DESC`).bind(id).all<any>();

  return c.json({
    success: true,
    client: {
      ...client,
      projects: projects.results,
      proposals: proposals.results,
      agreements: agreements.results,
      invoices: invoices.results,
      payments: payments.results
    }
  });
});

clientsApp.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const db = getDatabase(c.env);
  const user = c.get('user');

  const client = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(id).first<any>();
  if (!client) {
    return c.json({ success: false, error: 'Client not found' }, 404);
  }

  const now = new Date().toISOString();
  const fields: string[] = [];
  const params: any[] = [];

  const allowed = [
    'name', 'type', 'contact_person', 'email', 'phone',
    'billing_address', 'city', 'state', 'postal_code',
    'country', 'tax_id', 'notes', 'status'
  ];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(typeof body[key] === 'string' ? body[key].trim() : body[key]);
    }
  }

  if (fields.length === 0) {
    return c.json({ success: true, client });
  }

  fields.push(`updated_at = ?`);
  params.push(now);
  params.push(id);

  await db.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();
  await recordAuditLog(db, user.id, 'client_updated', 'client', id, body);

  const updated = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(id).first();
  return c.json({ success: true, client: updated });
});
