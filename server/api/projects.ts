// server/api/projects.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { authMiddleware, recordAuditLog } from '../auth/middleware';
import { AppEnv } from '../types';

export const projectsApp = new Hono<AppEnv>();
projectsApp.use('*', authMiddleware);

projectsApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const clientId = c.req.query('client_id');
  const status = c.req.query('status');

  let query = `
    SELECT p.*, c.name as client_name, c.email as client_email
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (clientId) {
    query += ` AND p.client_id = ?`;
    params.push(clientId);
  }

  if (status && status !== 'all') {
    query += ` AND p.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY p.created_at DESC`;
  const result = await db.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, projects: result.results });
});

projectsApp.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    name,
    client_id,
    description,
    service_category,
    start_date,
    expected_completion_date,
    status = 'lead',
    internal_notes
  } = body;

  if (!name || !client_id) {
    return c.json({ success: false, error: 'Project name and client are required' }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');

  // Verify client exists
  const client = await db.prepare(`SELECT id FROM clients WHERE id = ?`).bind(client_id).first();
  if (!client) {
    return c.json({ success: false, error: 'Selected client does not exist' }, 404);
  }

  const projectId = `prj_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO projects (id, name, client_id, description, service_category, start_date, expected_completion_date, status, internal_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    projectId,
    name.trim(),
    client_id,
    description?.trim() || null,
    service_category?.trim() || null,
    start_date || null,
    expected_completion_date || null,
    status,
    internal_notes?.trim() || null,
    now,
    now
  ).run();

  await recordAuditLog(db, user.id, 'project_created', 'project', projectId, { name, client_id, status });

  const project = await db.prepare(`
    SELECT p.*, c.name as client_name
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).bind(projectId).first();

  return c.json({ success: true, project }, 201);
});

projectsApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);

  const project = await db.prepare(`
    SELECT p.*, c.name as client_name, c.email as client_email, c.phone as client_phone
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).bind(id).first<any>();

  if (!project) {
    return c.json({ success: false, error: 'Project not found' }, 404);
  }

  const proposals = await db.prepare(`SELECT * FROM proposals WHERE project_id = ? ORDER BY created_at DESC`).bind(id).all<any>();
  const agreements = await db.prepare(`SELECT * FROM agreements WHERE project_id = ? ORDER BY created_at DESC`).bind(id).all<any>();
  const invoices = await db.prepare(`SELECT * FROM invoices WHERE project_id = ? ORDER BY created_at DESC`).bind(id).all<any>();

  return c.json({
    success: true,
    project: {
      ...project,
      proposals: proposals.results,
      agreements: agreements.results,
      invoices: invoices.results
    }
  });
});

projectsApp.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const db = getDatabase(c.env);
  const user = c.get('user');

  const project = await db.prepare(`SELECT * FROM projects WHERE id = ?`).bind(id).first<any>();
  if (!project) {
    return c.json({ success: false, error: 'Project not found' }, 404);
  }

  const validStatuses = [
    'lead', 'proposal_preparation', 'proposal_sent', 'awaiting_approval',
    'agreement_pending', 'ready_to_start', 'in_progress', 'on_hold', 'completed', 'cancelled'
  ];

  if (body.status && !validStatuses.includes(body.status)) {
    return c.json({ success: false, error: `Invalid project status: ${body.status}` }, 400);
  }

  const now = new Date().toISOString();
  const fields: string[] = [];
  const params: any[] = [];

  const allowed = [
    'name', 'description', 'service_category', 'start_date',
    'expected_completion_date', 'status', 'internal_notes'
  ];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(typeof body[key] === 'string' ? body[key].trim() : body[key]);
    }
  }

  if (fields.length === 0) {
    return c.json({ success: true, project });
  }

  fields.push(`updated_at = ?`);
  params.push(now);
  params.push(id);

  await db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();
  await recordAuditLog(db, user.id, 'project_updated', 'project', id, body);

  const updated = await db.prepare(`SELECT * FROM projects WHERE id = ?`).bind(id).first();
  return c.json({ success: true, project: updated });
});
