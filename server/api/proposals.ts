// server/api/proposals.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { getStorage } from '../storage/index';
import { getEmailProvider, logEmailEvent } from '../email/index';
import { generateProposalPdf } from '../pdf/generator';
import { generateToken } from '../auth/crypto';
import { authMiddleware, recordAuditLog } from '../auth/middleware';
import { AppEnv } from '../types';

export const proposalsApp = new Hono<AppEnv>();
proposalsApp.use('*', authMiddleware);

proposalsApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const status = c.req.query('status');
  const clientId = c.req.query('client_id');
  const projectId = c.req.query('project_id');

  let query = `
    SELECT pr.*, c.name as client_name, c.email as client_email, p.name as project_name
    FROM proposals pr
    JOIN clients c ON pr.client_id = c.id
    JOIN projects p ON pr.project_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ` AND pr.status = ?`;
    params.push(status);
  }
  if (clientId) {
    query += ` AND pr.client_id = ?`;
    params.push(clientId);
  }
  if (projectId) {
    query += ` AND pr.project_id = ?`;
    params.push(projectId);
  }

  query += ` ORDER BY pr.created_at DESC`;
  const result = await db.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, proposals: result.results });
});

proposalsApp.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    client_id,
    project_id,
    title,
    introduction,
    client_requirements,
    project_objectives,
    scope_of_work,
    deliverables,
    exclusions,
    timeline,
    milestones,
    revision_policy,
    client_responsibilities,
    freelancer_responsibilities,
    payment_schedule,
    additional_terms,
    closing_statement,
    validity_days = 14,
    items = []
  } = body;

  if (!client_id || !project_id || !title || !scope_of_work || !deliverables || !timeline || !payment_schedule) {
    return c.json({
      success: false,
      error: 'Missing required proposal fields: client, project, title, scope of work, deliverables, timeline, and payment schedule are required.'
    }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');
  const now = new Date();
  const nowIso = now.toISOString();

  // Verify client and project
  const project = await db.prepare(`SELECT * FROM projects WHERE id = ? AND client_id = ?`).bind(project_id, client_id).first();
  if (!project) {
    return c.json({ success: false, error: 'Project does not exist or does not belong to client' }, 400);
  }

  // Calculate items and financial sums on server
  let subtotal = 0;
  const processedItems = items.map((item: any, idx: number) => {
    const qty = Math.max(0, Number(item.quantity) || 1);
    const rate = Math.max(0, Number(item.rate) || 0);
    const discount = Math.max(0, Number(item.discount) || 0);
    const calculatedAmount = Math.max(0, (qty * rate) - discount);
    subtotal += calculatedAmount;
    return {
      position: idx,
      description: item.description?.trim() || 'Service Deliverable',
      quantity: qty,
      unit: item.unit?.trim() || 'item',
      rate,
      discount,
      calculatedAmount
    };
  });

  const overallDiscount = Math.max(0, Number(body.discount) || 0);
  const total = Math.max(0, subtotal - overallDiscount);

  // Allocate atomic proposal number: AD-PROP-YYYY-XXXX
  const currentYear = now.getFullYear();
  const countRow = await db.prepare(`
    SELECT COUNT(*) as count FROM proposals WHERE proposal_number LIKE ?
  `).bind(`AD-PROP-${currentYear}-%`).first<{ count: number }>();
  const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
  const proposalNumber = `AD-PROP-${currentYear}-${seq}`;

  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const portalToken = generateToken(32);
  const validUntil = new Date(now.getTime() + validity_days * 24 * 60 * 60 * 1000).toISOString();

  // Create Proposal
  await db.prepare(`
    INSERT INTO proposals (
      id, proposal_number, client_id, project_id, title, status, current_version,
      portal_token, portal_token_expires_at, currency, subtotal, discount, tax, total,
      validity_days, valid_until, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'draft', 1, ?, ?, 'INR', ?, ?, 0, ?, ?, ?, ?, ?)
  `).bind(
    proposalId,
    proposalNumber,
    client_id,
    project_id,
    title.trim(),
    portalToken,
    validUntil,
    subtotal,
    overallDiscount,
    total,
    validity_days,
    validUntil,
    nowIso,
    nowIso
  ).run();

  // Create Proposal Version 1
  const versionId = `prop_v1_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO proposal_versions (
      id, proposal_id, version_number, title, introduction, client_requirements,
      project_objectives, scope_of_work, deliverables, exclusions, timeline,
      milestones, revision_policy, client_responsibilities, freelancer_responsibilities,
      payment_schedule, additional_terms, closing_statement, subtotal, discount, total,
      created_at, created_by
    ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    versionId,
    proposalId,
    title.trim(),
    introduction?.trim() || null,
    client_requirements?.trim() || null,
    project_objectives?.trim() || null,
    scope_of_work.trim(),
    deliverables.trim(),
    exclusions?.trim() || null,
    timeline.trim(),
    milestones?.trim() || null,
    revision_policy?.trim() || 'Up to 2 rounds of revisions included per milestone.',
    client_responsibilities?.trim() || null,
    freelancer_responsibilities?.trim() || null,
    payment_schedule.trim(),
    additional_terms?.trim() || null,
    closing_statement?.trim() || null,
    subtotal,
    overallDiscount,
    total,
    nowIso,
    user.id
  ).run();

  // Create Items
  for (const item of processedItems) {
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await db.prepare(`
      INSERT INTO proposal_items (id, proposal_version_id, position, description, quantity, unit, rate, discount, calculated_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      itemId,
      versionId,
      item.position,
      item.description,
      item.quantity,
      item.unit,
      item.rate,
      item.discount,
      item.calculatedAmount
    ).run();
  }

  // Update project status to 'proposal_preparation' if currently 'lead'
  await db.prepare(`
    UPDATE projects SET status = 'proposal_preparation', updated_at = ?
    WHERE id = ? AND status = 'lead'
  `).bind(nowIso, project_id).run();

  await recordAuditLog(db, user.id, 'proposal_created', 'proposal', proposalId, {
    proposalNumber,
    version: 1,
    total
  });

  const created = await db.prepare(`SELECT * FROM proposals WHERE id = ?`).bind(proposalId).first();
  return c.json({ success: true, proposal: created }, 201);
});

proposalsApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);

  const proposal = await db.prepare(`
    SELECT pr.*, c.name as client_name, c.email as client_email, c.billing_address as client_address,
           p.name as project_name
    FROM proposals pr
    JOIN clients c ON pr.client_id = c.id
    JOIN projects p ON pr.project_id = p.id
    WHERE pr.id = ?
  `).bind(id).first<any>();

  if (!proposal) {
    return c.json({ success: false, error: 'Proposal not found' }, 404);
  }

  // Get current version
  const version = await db.prepare(`
    SELECT * FROM proposal_versions WHERE proposal_id = ? AND version_number = ?
  `).bind(id, proposal.current_version).first<any>();

  let items: any[] = [];
  if (version) {
    const itemsRes = await db.prepare(`
      SELECT * FROM proposal_items WHERE proposal_version_id = ? ORDER BY position ASC
    `).bind(version.id).all<any>();
    items = itemsRes.results;
  }

  const versions = await db.prepare(`
    SELECT id, version_number, title, total, created_at FROM proposal_versions WHERE proposal_id = ? ORDER BY version_number DESC
  `).bind(id).all<any>();

  const acceptance = await db.prepare(`
    SELECT * FROM proposal_acceptances WHERE proposal_id = ?
  `).bind(id).first<any>();

  return c.json({
    success: true,
    proposal: {
      ...proposal,
      currentVersionDetails: version,
      items,
      versions: versions.results,
      acceptance
    }
  });
});

proposalsApp.post('/:id/send', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);
  const user = c.get('user');

  const proposal = await db.prepare(`
    SELECT pr.*, c.name as client_name, c.email as client_email, c.billing_address as client_address,
           p.name as project_name
    FROM proposals pr
    JOIN clients c ON pr.client_id = c.id
    JOIN projects p ON pr.project_id = p.id
    WHERE pr.id = ?
  `).bind(id).first<any>();

  if (!proposal) {
    return c.json({ success: false, error: 'Proposal not found' }, 404);
  }

  if (['accepted', 'declined', 'expired'].includes(proposal.status)) {
    return c.json({ success: false, error: `Cannot send proposal with status '${proposal.status}'` }, 400);
  }

  const version = await db.prepare(`
    SELECT * FROM proposal_versions WHERE proposal_id = ? AND version_number = ?
  `).bind(id, proposal.current_version).first<any>();

  const items = await db.prepare(`
    SELECT * FROM proposal_items WHERE proposal_version_id = ? ORDER BY position ASC
  `).bind(version.id).all<any>();

  // Fetch business settings
  const settingsRows = await db.prepare(`SELECT key, value FROM business_settings`).all<any>();
  const settings: Record<string, string> = {};
  for (const row of settingsRows.results) {
    settings[row.key] = row.value;
  }

  // 1. Generate Proposal PDF
  const pdfBytes = await generateProposalPdf({
    proposalNumber: proposal.proposal_number,
    version: proposal.current_version,
    title: version.title,
    clientName: proposal.client_name,
    clientEmail: proposal.client_email,
    clientAddress: proposal.client_address,
    scopeOfWork: version.scope_of_work,
    deliverables: version.deliverables,
    timeline: version.timeline,
    paymentSchedule: version.payment_schedule,
    items: items.results.map((i: any) => ({
      description: i.description,
      quantity: i.quantity,
      rate: i.rate,
      calculatedAmount: i.calculated_amount
    })),
    subtotal: version.subtotal,
    discount: version.discount,
    total: version.total,
    validUntil: proposal.valid_until,
    businessSettings: settings
  });

  // 2. Store PDF in R2 / Local Storage
  const storage = getStorage(c.env);
  const r2Key = `proposals/${proposal.proposal_number}_v${proposal.current_version}.pdf`;
  const stored = await storage.put(r2Key, pdfBytes, 'application/pdf');

  // Record document record
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO documents (id, entity_type, entity_id, file_name, file_size, mime_type, r2_key, sha256_hash, created_at)
    VALUES (?, 'proposal', ?, ?, ?, 'application/pdf', ?, ?, ?)
  `).bind(docId, id, `${proposal.proposal_number}.pdf`, stored.size, stored.key, stored.sha256, new Date().toISOString()).run();

  // 3. Update proposal status to 'sent'
  const nowIso = new Date().toISOString();
  await db.prepare(`
    UPDATE proposals SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?
  `).bind(nowIso, nowIso, id).run();

  // 4. Update project status to 'proposal_sent'
  await db.prepare(`
    UPDATE projects SET status = 'proposal_sent', updated_at = ? WHERE id = ?
  `).bind(nowIso, proposal.project_id).run();

  // 5. Send Email if provider is configured
  const { provider, isConfigured } = getEmailProvider(c.env);
  const portalUrl = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/portal/${proposal.portal_token}/proposal`;

  let emailSent = false;
  let emailError: string | null = null;

  if (isConfigured) {
    const emailResult = await provider.send({
      to: proposal.client_email,
      subject: `Project Proposal: ${version.title} (${proposal.proposal_number})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111827;">Advaita Designs</h2>
          <p>Dear ${proposal.client_name},</p>
          <p>We are pleased to present our proposal for <strong>${version.title}</strong>.</p>
          <p>You can review the full project scope, deliverables, timeline, and investment terms through your secure client portal:</p>
          <p style="margin: 30px 0;">
            <a href="${portalUrl}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review Proposal Online
            </a>
          </p>
          <p>Proposal Ref: ${proposal.proposal_number} | Valid until: ${proposal.valid_until}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Advaita Designs — Confidential</p>
        </div>
      `,
      entityType: 'proposal',
      entityId: id
    });

    emailSent = emailResult.success;
    emailError = emailResult.error || null;
    await logEmailEvent(db, proposal.client_email, 'proposal_sent', `Project Proposal: ${version.title}`, emailSent ? 'sent' : 'failed', emailError, 'proposal', id);
  }

  await recordAuditLog(db, user.id, 'proposal_sent', 'proposal', id, {
    recipient: proposal.client_email,
    portalUrl,
    pdfSha256: stored.sha256,
    emailSent,
    isEmailConfigured: isConfigured
  });

  return c.json({
    success: true,
    message: 'Proposal successfully issued and sent.',
    portalUrl,
    pdfKey: stored.key,
    emailDelivered: emailSent,
    emailWarning: !isConfigured ? 'Email provider not configured. Please share the portal link manually.' : (emailError ? `Email dispatch error: ${emailError}` : null)
  });
});
