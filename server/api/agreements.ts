// server/api/agreements.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { getStorage } from '../storage/index';
import { generateAgreementPdf } from '../pdf/generator';
import { generateToken, sha256 } from '../auth/crypto';
import { authMiddleware, recordAuditLog } from '../auth/middleware';
import { AppEnv } from '../types';

export const agreementsApp = new Hono<AppEnv>();
agreementsApp.use('*', authMiddleware);

agreementsApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const status = c.req.query('status');
  const clientId = c.req.query('client_id');

  let query = `
    SELECT a.*, c.name as client_name, c.email as client_email,
           pr.proposal_number, pr.title as proposal_title, p.name as project_name
    FROM agreements a
    JOIN clients c ON a.client_id = c.id
    JOIN proposals pr ON a.proposal_id = pr.id
    JOIN projects p ON a.project_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ` AND a.status = ?`;
    params.push(status);
  }
  if (clientId) {
    query += ` AND a.client_id = ?`;
    params.push(clientId);
  }

  query += ` ORDER BY a.created_at DESC`;
  const result = await db.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, agreements: result.results });
});

// POST /api/agreements (Generate agreement from accepted proposal)
agreementsApp.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { proposal_id, signing_order = 'client_first', signing_method = 'electronic', custom_terms } = body;

  if (!proposal_id) {
    return c.json({ success: false, error: 'Proposal ID is required.' }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');

  // Verify proposal exists and is in ACCEPTED status!
  const proposal = await db.prepare(`
    SELECT pr.*, c.name as client_name, c.email as client_email, c.billing_address as client_address
    FROM proposals pr
    JOIN clients c ON pr.client_id = c.id
    WHERE pr.id = ?
  `).bind(proposal_id).first<any>();

  if (!proposal) {
    return c.json({ success: false, error: 'Proposal not found.' }, 404);
  }

  // Precondition: Proposal must be accepted!
  if (proposal.status !== 'accepted') {
    return c.json({
      success: false,
      error: `Cannot generate agreement for proposal with status '${proposal.status}'. Proposal must be accepted by the client first.`
    }, 400);
  }

  // Check if an active agreement already exists for this proposal
  const existingAgr = await db.prepare(`
    SELECT id, agreement_number, status FROM agreements WHERE proposal_id = ? AND status NOT IN ('declined', 'cancelled', 'superseded')
  `).bind(proposal_id).first<any>();

  if (existingAgr) {
    return c.json({
      success: false,
      error: `An active agreement (${existingAgr.agreement_number}) already exists for this proposal.`
    }, 409);
  }

  // Fetch accepted proposal version
  const propVersion = await db.prepare(`
    SELECT * FROM proposal_versions WHERE proposal_id = ? AND version_number = ?
  `).bind(proposal.id, proposal.current_version).first<any>();

  // Fetch default agreement template
  const tmpl = await db.prepare(`SELECT content FROM document_templates WHERE type = 'agreement' AND is_default = 1`).first<any>();
  const defaultLegalTerms = tmpl?.content || 'Standard mutual agreement terms apply.';

  const now = new Date();
  const nowIso = now.toISOString();

  // Allocate atomic agreement number: AD-AGR-YYYY-XXXX
  const currentYear = now.getFullYear();
  const countRow = await db.prepare(`
    SELECT COUNT(*) as count FROM agreements WHERE agreement_number LIKE ?
  `).bind(`AD-AGR-${currentYear}-%`).first<{ count: number }>();
  const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
  const agreementNumber = `AD-AGR-${currentYear}-${seq}`;

  const agreementId = `agr_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // 1. Create Agreement
  await db.prepare(`
    INSERT INTO agreements (
      id, agreement_number, proposal_id, project_id, client_id, status, current_version,
      signing_order, signing_method, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)
  `).bind(
    agreementId,
    agreementNumber,
    proposal.id,
    proposal.project_id,
    proposal.client_id,
    signing_order,
    signing_method,
    nowIso,
    nowIso
  ).run();

  // 2. Create Agreement Version 1 (derived from proposal terms)
  const versionId = `agr_v1_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO agreement_versions (
      id, agreement_id, version_number, legal_terms, scope_of_work, deliverables,
      timeline, price, payment_milestones, revision_limits, ip_terms, confidentiality_terms,
      termination_conditions, dispute_resolution, governing_law, effective_date,
      additional_clauses, created_at, created_by
    ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    versionId,
    agreementId,
    custom_terms || defaultLegalTerms,
    propVersion.scope_of_work,
    propVersion.deliverables,
    propVersion.timeline,
    proposal.total,
    propVersion.payment_schedule,
    propVersion.revision_policy || 'Two rounds of revisions per milestone included.',
    'Designer transfers final approved design copyright to Client upon receipt of 100% final payment. Designer retains exhibition and portfolio rights.',
    'Both parties shall keep all proprietary business information confidential indefinitely.',
    '14 calendar days written notice. Client pays for all deliverables completed up to termination date.',
    'Good-faith negotiation followed by arbitration in Chennai, India.',
    'Jurisdiction of Chennai, Tamil Nadu, India',
    nowIso.split('T')[0],
    propVersion.additional_terms || null,
    nowIso,
    user.id
  ).run();

  // 3. Create Required Signers: Client & Freelancer
  const clientToken = generateToken(32);
  const freelancerToken = generateToken(32);

  await db.prepare(`
    INSERT INTO agreement_signers (id, agreement_id, version_number, role, signer_name, signer_email, status, token, order_index)
    VALUES (?, ?, 1, 'client', ?, ?, 'pending', ?, 1)
  `).bind(`as_cli_${Date.now()}`, agreementId, proposal.client_name, proposal.client_email, clientToken).run();

  await db.prepare(`
    INSERT INTO agreement_signers (id, agreement_id, version_number, role, signer_name, signer_email, status, token, order_index)
    VALUES (?, ?, 1, 'freelancer', ?, ?, 'pending', ?, 2)
  `).bind(`as_fre_${Date.now()}`, agreementId, user.name, user.email, freelancerToken).run();

  await recordAuditLog(db, user.id, 'agreement_generated', 'agreement', agreementId, {
    agreementNumber,
    proposalNumber: proposal.proposal_number,
    version: 1
  });

  const created = await db.prepare(`SELECT * FROM agreements WHERE id = ?`).bind(agreementId).first();
  return c.json({ success: true, agreement: created }, 201);
});

// GET /api/agreements/:id
agreementsApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);

  const agreement = await db.prepare(`
    SELECT a.*, c.name as client_name, c.email as client_email, c.billing_address as client_address,
           pr.proposal_number, pr.title as proposal_title, pr.portal_token, p.name as project_name
    FROM agreements a
    JOIN clients c ON a.client_id = c.id
    JOIN proposals pr ON a.proposal_id = pr.id
    JOIN projects p ON a.project_id = p.id
    WHERE a.id = ?
  `).bind(id).first<any>();

  if (!agreement) {
    return c.json({ success: false, error: 'Agreement not found.' }, 404);
  }

  const version = await db.prepare(`
    SELECT * FROM agreement_versions WHERE agreement_id = ? AND version_number = ?
  `).bind(id, agreement.current_version).first<any>();

  const signers = await db.prepare(`
    SELECT * FROM agreement_signers WHERE agreement_id = ? ORDER BY order_index ASC
  `).bind(id).all<any>();

  const signatures = await db.prepare(`
    SELECT * FROM signatures WHERE agreement_id = ? ORDER BY created_at ASC
  `).bind(id).all<any>();

  return c.json({
    success: true,
    agreement: {
      ...agreement,
      details: version,
      signers: signers.results,
      signatures: signatures.results
    }
  });
});

// POST /api/agreements/:id/send (Send to client for signature)
agreementsApp.post('/:id/send', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);
  const user = c.get('user');

  const agreement = await db.prepare(`
    SELECT a.*, pr.portal_token, c.email as client_email, c.name as client_name
    FROM agreements a
    JOIN proposals pr ON a.proposal_id = pr.id
    JOIN clients c ON a.client_id = c.id
    WHERE a.id = ?
  `).bind(id).first<any>();

  if (!agreement) {
    return c.json({ success: false, error: 'Agreement not found.' }, 404);
  }

  if (agreement.status !== 'draft') {
    return c.json({ success: false, error: `Agreement is already in '${agreement.status}' status.` }, 400);
  }

  const nowIso = new Date().toISOString();
  await db.prepare(`
    UPDATE agreements SET status = 'sent_for_signature', updated_at = ? WHERE id = ?
  `).bind(nowIso, id).run();

  await recordAuditLog(db, user.id, 'agreement_sent_for_signature', 'agreement', id, {
    recipient: agreement.client_email
  });

  return c.json({
    success: true,
    message: 'Agreement sent for signature. Client may now sign via their portal link.',
    portalUrl: `${process.env.APP_BASE_URL || 'http://localhost:5173'}/portal/${agreement.portal_token}/sign`
  });
});

// POST /api/agreements/:id/sign (Freelancer Admin Signature)
agreementsApp.post('/:id/sign', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { signer_name, signing_method = 'drawn', signature_data, consent_text } = body;

  if (!signer_name || !signature_data || !consent_text) {
    return c.json({ success: false, error: 'Signer name, signature and legal consent statement are required.' }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');

  const agreement = await db.prepare(`SELECT * FROM agreements WHERE id = ?`).bind(id).first<any>();
  if (!agreement) {
    return c.json({ success: false, error: 'Agreement not found.' }, 404);
  }

  if (['executed', 'cancelled', 'declined'].includes(agreement.status)) {
    return c.json({ success: false, error: `Cannot sign agreement in '${agreement.status}' status.` }, 400);
  }

  // Find freelancer signer
  const freelancerSigner = await db.prepare(`
    SELECT * FROM agreement_signers WHERE agreement_id = ? AND role = 'freelancer'
  `).bind(id).first<any>();

  if (!freelancerSigner) {
    return c.json({ success: false, error: 'Freelancer signer record not found.' }, 404);
  }
  if (freelancerSigner.status === 'signed') {
    return c.json({ success: false, error: 'Freelancer has already signed this agreement.' }, 400);
  }

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const ua = c.req.header('user-agent') || 'Advaita Admin App';
  const nowIso = new Date().toISOString();
  const docHash = await sha256(signature_data + signer_name + nowIso);

  // 1. Record Signature
  const sigId = `sig_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO signatures (id, agreement_id, signer_id, version_number, signing_method, signature_image_data, signed_name, consent_text, consent_at, ip_address, user_agent, verification_result, document_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'owner_verified', ?, ?)
  `).bind(
    sigId,
    id,
    freelancerSigner.id,
    agreement.current_version,
    signing_method,
    signature_data,
    signer_name.trim(),
    consent_text.trim(),
    nowIso,
    ip,
    ua,
    docHash,
    nowIso
  ).run();

  // 2. Update freelancer signer status
  await db.prepare(`
    UPDATE agreement_signers SET status = 'signed', signed_at = ? WHERE id = ?
  `).bind(nowIso, freelancerSigner.id).run();

  // 3. Check client signer status
  const clientSigner = await db.prepare(`
    SELECT * FROM agreement_signers WHERE agreement_id = ? AND role = 'client'
  `).bind(id).first<any>();

  const isClientSigned = clientSigner && clientSigner.status === 'signed';
  const newStatus = isClientSigned ? 'fully_signed' : 'partially_signed';

  await db.prepare(`
    UPDATE agreements SET status = ?, updated_at = ? WHERE id = ?
  `).bind(newStatus, nowIso, id).run();

  await recordAuditLog(db, user.id, 'agreement_signed_by_freelancer', 'agreement', id, {
    signer_name,
    signing_method,
    newStatus,
    docHash
  }, ip, ua);

  return c.json({
    success: true,
    message: newStatus === 'fully_signed' 
      ? 'Agreement fully signed by both parties! Ready for final execution.' 
      : 'Freelancer signature recorded. Waiting for client signature.',
    status: newStatus
  });
});

// POST /api/agreements/:id/upload-signed-copy (Physical signing upload workflow)
agreementsApp.post('/:id/upload-signed-copy', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { physical_signed_date, client_signer_name, freelancer_signer_name, notes, file_base64 } = body;

  if (!physical_signed_date || !client_signer_name || !freelancer_signer_name) {
    return c.json({
      success: false,
      error: 'Physical signing date and both signatory identities are required.'
    }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');

  const agreement = await db.prepare(`SELECT * FROM agreements WHERE id = ?`).bind(id).first<any>();
  if (!agreement) {
    return c.json({ success: false, error: 'Agreement not found.' }, 404);
  }

  const nowIso = new Date().toISOString();
  const storage = getStorage(c.env);
  let fileKey = `physical_agreements/${agreement.agreement_number}_scanned.pdf`;

  if (file_base64) {
    const rawData = file_base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Uint8Array.from(atob(rawData), c => c.charCodeAt(0));
    const stored = await storage.put(fileKey, buffer, 'application/pdf');
    fileKey = stored.key;
  }

  // Update physical details and set status to fully_signed
  await db.prepare(`
    UPDATE agreements SET
      signing_method = 'physical',
      physical_signed_doc_url = ?,
      physical_signed_date = ?,
      physical_uploader_id = ?,
      status = 'fully_signed',
      updated_at = ?
    WHERE id = ?
  `).bind(fileKey, physical_signed_date, user.id, nowIso, id).run();

  // Mark signers as signed physically
  await db.prepare(`
    UPDATE agreement_signers SET status = 'signed', signed_at = ? WHERE agreement_id = ?
  `).bind(nowIso, id).run();

  await recordAuditLog(db, user.id, 'physical_agreement_uploaded', 'agreement', id, {
    client_signer_name,
    freelancer_signer_name,
    physical_signed_date,
    fileKey
  });

  return c.json({
    success: true,
    message: 'Physically signed agreement verified and uploaded. Agreement is now ready for final execution.',
    agreementStatus: 'fully_signed'
  });
});

// POST /api/agreements/:id/finalize (Mark Executed & Generate Executed PDF)
agreementsApp.post('/:id/finalize', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);
  const user = c.get('user');

  const agreement = await db.prepare(`
    SELECT a.*, c.name as client_name, c.email as client_email, c.billing_address as client_address,
           pr.proposal_number, p.id as project_id, p.name as project_name
    FROM agreements a
    JOIN clients c ON a.client_id = c.id
    JOIN proposals pr ON a.proposal_id = pr.id
    JOIN projects p ON a.project_id = p.id
    WHERE a.id = ?
  `).bind(id).first<any>();

  if (!agreement) {
    return c.json({ success: false, error: 'Agreement not found.' }, 404);
  }

  // Precondition: Both parties must have completed signing!
  // Rule #3: An agreement cannot be marked as fully executed after only one signature!
  const signers = await db.prepare(`
    SELECT * FROM agreement_signers WHERE agreement_id = ?
  `).bind(id).all<any>();

  const unsignedSigners = signers.results.filter((s: any) => s.status !== 'signed');
  if (unsignedSigners.length > 0 && agreement.signing_method !== 'physical') {
    return c.json({
      success: false,
      error: `Execution blocked: All required parties must sign first. Outstanding signers: ${unsignedSigners.map((s: any) => s.role).join(', ')}`
    }, 400);
  }

  const version = await db.prepare(`
    SELECT * FROM agreement_versions WHERE agreement_id = ? AND version_number = ?
  `).bind(id, agreement.current_version).first<any>();

  const signatures = await db.prepare(`
    SELECT s.*, asg.role
    FROM signatures s
    JOIN agreement_signers asg ON s.signer_id = asg.id
    WHERE s.agreement_id = ?
  `).bind(id).all<any>();

  // Fetch business settings
  const settingsRows = await db.prepare(`SELECT key, value FROM business_settings`).all<any>();
  const settings: Record<string, string> = {};
  for (const row of settingsRows.results) {
    settings[row.key] = row.value;
  }

  // Generate Final Signed Agreement PDF
  const pdfBytes = await generateAgreementPdf({
    agreementNumber: agreement.agreement_number,
    version: agreement.current_version,
    proposalNumber: agreement.proposal_number,
    clientName: agreement.client_name,
    clientEmail: agreement.client_email,
    clientAddress: agreement.client_address,
    effectiveDate: version.effective_date,
    scopeOfWork: version.scope_of_work,
    deliverables: version.deliverables,
    timeline: version.timeline,
    price: version.price,
    paymentMilestones: version.payment_milestones,
    legalTerms: version.legal_terms,
    ipTerms: version.ip_terms,
    confidentialityTerms: version.confidentiality_terms,
    terminationConditions: version.termination_conditions,
    disputeResolution: version.dispute_resolution,
    governingLaw: version.governing_law,
    businessSettings: settings,
    signatures: signatures.results.map((s: any) => ({
      role: s.role,
      signerName: s.signed_name,
      signedAt: s.created_at,
      method: s.signing_method,
      signatureImageData: s.signature_image_data
    }))
  });

  // Store executed PDF
  const storage = getStorage(c.env);
  const r2Key = `agreements/${agreement.agreement_number}_executed.pdf`;
  const stored = await storage.put(r2Key, pdfBytes, 'application/pdf');

  // Record document in D1
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO documents (id, entity_type, entity_id, file_name, file_size, mime_type, r2_key, sha256_hash, created_at)
    VALUES (?, 'signed_copy', ?, ?, ?, 'application/pdf', ?, ?, ?)
  `).bind(docId, id, `${agreement.agreement_number}_EXECUTED.pdf`, stored.size, stored.key, stored.sha256, new Date().toISOString()).run();

  // Update agreement version hash
  await db.prepare(`
    UPDATE agreement_versions SET document_hash = ?, pdf_url = ? WHERE id = ?
  `).bind(stored.sha256, stored.key, version.id).run();

  // Mark agreement as EXECUTED
  const nowIso = new Date().toISOString();
  await db.prepare(`
    UPDATE agreements SET status = 'executed', executed_at = ?, updated_at = ? WHERE id = ?
  `).bind(nowIso, nowIso, id).run();

  // Update project status to 'in_progress' or 'ready_to_start'
  await db.prepare(`
    UPDATE projects SET status = 'in_progress', updated_at = ? WHERE id = ?
  `).bind(nowIso, agreement.project_id).run();

  await recordAuditLog(db, user.id, 'agreement_executed', 'agreement', id, {
    agreementNumber: agreement.agreement_number,
    documentHash: stored.sha256,
    finalPdfKey: stored.key
  });

  return c.json({
    success: true,
    message: 'Agreement has been officially finalized and marked EXECUTED. Invoicing is now unlocked!',
    agreementStatus: 'executed',
    executedPdfUrl: stored.key,
    documentHash: stored.sha256
  });
});
