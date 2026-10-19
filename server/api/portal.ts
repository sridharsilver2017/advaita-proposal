// server/api/portal.ts
// Public Client Portal API endpoints secured strictly by high-entropy engagement tokens
import { Hono } from 'hono';
import { getDatabase, D1Database } from '../db/adapter';
import { getStorage } from '../storage/index';
import { sha256 } from '../auth/crypto';
import { recordAuditLog } from '../auth/middleware';
import { AppEnv } from '../types';

export const portalApp = new Hono<AppEnv>();

// Helper to resolve engagement context from token
async function getEngagementFromToken(db: D1Database, token: string) {
  if (!token || token.length < 16) return null;

  const now = new Date().toISOString();
  // Find proposal by portal token
  const proposal = await db.prepare(`
    SELECT pr.*, c.name as client_name, c.email as client_email, c.billing_address as client_address,
           c.phone as client_phone, p.name as project_name, p.status as project_status
    FROM proposals pr
    JOIN clients c ON pr.client_id = c.id
    JOIN projects p ON pr.project_id = p.id
    WHERE pr.portal_token = ?
  `).bind(token).first<any>();

  if (!proposal) return null;

  // Check token expiry
  if (proposal.portal_token_expires_at && proposal.portal_token_expires_at < now) {
    return { expired: true, proposal };
  }

  // Check agreement if any
  const agreement = await db.prepare(`
    SELECT a.*
    FROM agreements a
    WHERE a.proposal_id = ?
    ORDER BY a.created_at DESC
  `).bind(proposal.id).first<any>();

  let agreementSigners: any[] = [];
  let agreementDetails: any = null;
  if (agreement) {
    const signersRes = await db.prepare(`
      SELECT * FROM agreement_signers WHERE agreement_id = ?
    `).bind(agreement.id).all<any>();
    agreementSigners = signersRes.results;

    const versionRes = await db.prepare(`
      SELECT * FROM agreement_versions WHERE agreement_id = ? AND version_number = ?
    `).bind(agreement.id, agreement.current_version).first<any>();
    agreementDetails = versionRes;
  }

  // Check invoices if any
  const invoices = await db.prepare(`
    SELECT id, invoice_number, issue_date, due_date, status, currency, total_payable, amount_paid, balance_due
    FROM invoices
    WHERE proposal_id = ? AND status != 'draft'
    ORDER BY created_at DESC
  `).bind(proposal.id).all<any>();

  return {
    expired: false,
    proposal,
    agreement: agreement ? { ...agreement, details: agreementDetails, signers: agreementSigners } : null,
    invoices: invoices.results
  };
}

// GET /api/portal/:token
portalApp.get('/:token', async (c) => {
  const token = c.req.param('token');
  const db = getDatabase(c.env);

  const engagement = await getEngagementFromToken(db, token);
  if (!engagement) {
    return c.json({ success: false, error: 'Invalid or revoked portal access link.' }, 404);
  }

  if (engagement.expired) {
    return c.json({
      success: false,
      error: 'This secure portal link has expired. Please contact Advaita Designs for a refreshed link.',
      isExpired: true
    }, 403);
  }

  const { proposal, agreement, invoices } = engagement;

  // Track proposal 'viewed' status if currently 'sent'
  if (proposal.status === 'sent') {
    await db.prepare(`
      UPDATE proposals SET status = 'viewed', updated_at = ? WHERE id = ?
    `).bind(new Date().toISOString(), proposal.id).run();
    proposal.status = 'viewed';
  }

  // Fetch current version details and items
  const version = await db.prepare(`
    SELECT * FROM proposal_versions WHERE proposal_id = ? AND version_number = ?
  `).bind(proposal.id, proposal.current_version).first<any>();

  const items = await db.prepare(`
    SELECT * FROM proposal_items WHERE proposal_version_id = ? ORDER BY position ASC
  `).bind(version.id).all<any>();

  const acceptance = await db.prepare(`
    SELECT * FROM proposal_acceptances WHERE proposal_id = ?
  `).bind(proposal.id).first<any>();

  // Fetch business settings for brand display
  const settingsRows = await db.prepare(`SELECT key, value FROM business_settings`).all<any>();
  const settings: Record<string, string> = {};
  for (const row of settingsRows.results) {
    settings[row.key] = row.value;
  }

  return c.json({
    success: true,
    portal: {
      client: {
        name: proposal.client_name,
        email: proposal.client_email,
        phone: proposal.client_phone,
        address: proposal.client_address
      },
      project: {
        name: proposal.project_name,
        status: proposal.project_status
      },
      proposal: {
        id: proposal.id,
        number: proposal.proposal_number,
        title: proposal.title,
        status: proposal.status,
        version: proposal.current_version,
        currency: proposal.currency,
        subtotal: proposal.subtotal,
        discount: proposal.discount,
        total: proposal.total,
        validUntil: proposal.valid_until,
        sentAt: proposal.sent_at,
        details: version,
        items: items.results,
        acceptance
      },
      agreement,
      invoices,
      business: {
        name: settings.business_name || 'Advaita Designs',
        logo: settings.logo_url || '/logos/advaita-logo.png',
        tagline: settings.tagline || 'Design Architecture',
        email: settings.email || 'hello@advaitadesigns.com',
        phone: settings.phone,
        address: settings.address_line1,
        city: settings.city,
        state: settings.state,
        country: settings.country,
        currency: settings.currency || 'INR'
      }
    }
  });
});

// POST /api/portal/:token/proposal/accept
portalApp.post('/:token/proposal/accept', async (c) => {
  const token = c.req.param('token');
  const body = await c.req.json().catch(() => ({}));
  const { client_name, client_email, confirm_acceptance } = body;

  if (!confirm_acceptance) {
    return c.json({ success: false, error: 'You must explicitly confirm acceptance of the proposal terms.' }, 400);
  }
  if (!client_name || !client_email) {
    return c.json({ success: false, error: 'Name and email are required to complete acceptance.' }, 400);
  }

  const db = getDatabase(c.env);
  const engagement = await getEngagementFromToken(db, token);
  if (!engagement || engagement.expired) {
    return c.json({ success: false, error: 'Invalid or expired portal link.' }, 403);
  }

  const { proposal } = engagement;

  // Enforce status check
  if (['accepted', 'declined', 'expired', 'withdrawn', 'superseded'].includes(proposal.status)) {
    return c.json({ success: false, error: `Proposal cannot be accepted because it is already '${proposal.status}'.` }, 400);
  }

  // Check proposal validity date
  const now = new Date();
  if (new Date(proposal.valid_until) < now) {
    await db.prepare(`UPDATE proposals SET status = 'expired', updated_at = ? WHERE id = ?`).bind(now.toISOString(), proposal.id).run();
    return c.json({ success: false, error: 'This proposal has expired. Please contact Advaita Designs for a renewed proposal.' }, 400);
  }

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const ua = c.req.header('user-agent') || 'Unknown';
  const nowIso = now.toISOString();

  const acceptanceId = `acc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // 1. Record Acceptance snapshot
  await db.prepare(`
    INSERT INTO proposal_acceptances (id, proposal_id, version_number, client_name, client_email, verification_method, ip_address, user_agent, acceptance_metadata, accepted_at)
    VALUES (?, ?, ?, ?, ?, 'portal_token', ?, ?, ?, ?)
  `).bind(
    acceptanceId,
    proposal.id,
    proposal.current_version,
    client_name.trim(),
    client_email.trim().toLowerCase(),
    ip,
    ua,
    JSON.stringify({ timestamp: nowIso, confirmed: true }),
    nowIso
  ).run();

  // 2. Lock proposal and update status to 'accepted'
  await db.prepare(`
    UPDATE proposals SET status = 'accepted', accepted_at = ?, updated_at = ? WHERE id = ?
  `).bind(nowIso, nowIso, proposal.id).run();

  // 3. Update project status to 'agreement_pending'
  await db.prepare(`
    UPDATE projects SET status = 'agreement_pending', updated_at = ? WHERE id = ?
  `).bind(nowIso, proposal.project_id).run();

  // 4. Create internal notification for freelancer
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO notifications (id, type, title, message, entity_type, entity_id, is_read, created_at)
    VALUES (?, 'proposal_response', 'Proposal Accepted', ?, 'proposal', ?, 0, ?)
  `).bind(
    notifId,
    `Proposal ${proposal.proposal_number} accepted by ${client_name}. You may now prepare and send the Mutual Agreement.`,
    proposal.id,
    nowIso
  ).run();

  await recordAuditLog(db, null, 'proposal_accepted', 'proposal', proposal.id, {
    client_name,
    client_email,
    version: proposal.current_version
  }, ip, ua);

  return c.json({
    success: true,
    message: 'Proposal successfully accepted! Advaita Designs has been notified to draft your Mutual Service Agreement.'
  });
});

// POST /api/portal/:token/proposal/decline
portalApp.post('/:token/proposal/decline', async (c) => {
  const token = c.req.param('token');
  const body = await c.req.json().catch(() => ({}));
  const { reason } = body;

  const db = getDatabase(c.env);
  const engagement = await getEngagementFromToken(db, token);
  if (!engagement || engagement.expired) {
    return c.json({ success: false, error: 'Invalid or expired portal link.' }, 403);
  }

  const { proposal } = engagement;
  if (['accepted', 'declined', 'expired'].includes(proposal.status)) {
    return c.json({ success: false, error: `Proposal is already '${proposal.status}'.` }, 400);
  }

  const nowIso = new Date().toISOString();
  await db.prepare(`
    UPDATE proposals SET status = 'declined', declined_at = ?, decline_reason = ?, updated_at = ? WHERE id = ?
  `).bind(nowIso, reason?.trim() || 'No reason provided', nowIso, proposal.id).run();

  await recordAuditLog(db, null, 'proposal_declined', 'proposal', proposal.id, { reason });

  return c.json({ success: true, message: 'Proposal declined.' });
});

// POST /api/portal/:token/agreement/sign
portalApp.post('/:token/agreement/sign', async (c) => {
  const token = c.req.param('token');
  const body = await c.req.json().catch(() => ({}));
  const { signer_name, signing_method = 'drawn', signature_data, consent_text } = body;

  if (!signer_name || !signature_data || !consent_text) {
    return c.json({ success: false, error: 'Signer name, signature, and legal consent are required.' }, 400);
  }

  const db = getDatabase(c.env);
  const engagement = await getEngagementFromToken(db, token);
  if (!engagement || engagement.expired || !engagement.agreement) {
    return c.json({ success: false, error: 'No active agreement ready for signature.' }, 400);
  }

  const { agreement } = engagement;

  if (!['sent_for_signature', 'partially_signed'].includes(agreement.status)) {
    return c.json({ success: false, error: `Agreement is in status '${agreement.status}' and cannot be signed.` }, 400);
  }

  // Find client signer
  const clientSigner = agreement.signers.find((s: any) => s.role === 'client');
  if (!clientSigner) {
    return c.json({ success: false, error: 'Client signer record not found.' }, 404);
  }
  if (clientSigner.status === 'signed') {
    return c.json({ success: false, error: 'Agreement has already been signed by the client.' }, 400);
  }

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const ua = c.req.header('user-agent') || 'Unknown';
  const nowIso = new Date().toISOString();
  const docHash = await sha256(signature_data + signer_name + nowIso);

  // 1. Record Signature
  const sigId = `sig_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO signatures (id, agreement_id, signer_id, version_number, signing_method, signature_image_data, signed_name, consent_text, consent_at, ip_address, user_agent, verification_result, document_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified_intent', ?, ?)
  `).bind(
    sigId,
    agreement.id,
    clientSigner.id,
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

  // 2. Mark client signer as signed
  await db.prepare(`
    UPDATE agreement_signers SET status = 'signed', signed_at = ? WHERE id = ?
  `).bind(nowIso, clientSigner.id).run();

  // 3. Check freelancer signer status
  const freelancerSigner = agreement.signers.find((s: any) => s.role === 'freelancer');
  const isFreelancerSigned = freelancerSigner && freelancerSigner.status === 'signed';

  let newAgreementStatus = 'partially_signed';
  if (isFreelancerSigned) {
    newAgreementStatus = 'fully_signed';
  }

  await db.prepare(`
    UPDATE agreements SET status = ?, updated_at = ? WHERE id = ?
  `).bind(newAgreementStatus, nowIso, agreement.id).run();

  // Create notification
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO notifications (id, type, title, message, entity_type, entity_id, is_read, created_at)
    VALUES (?, 'agreement_signed', ?, ?, 'agreement', ?, 0, ?)
  `).bind(
    notifId,
    newAgreementStatus === 'fully_signed' ? 'Agreement Fully Signed!' : 'Client Signed Agreement',
    newAgreementStatus === 'fully_signed'
      ? `Agreement ${agreement.agreement_number} has been signed by both parties! Ready for execution and invoicing.`
      : `Client ${signer_name} has signed agreement ${agreement.agreement_number}. Your countersignature is required.`,
    agreement.id,
    nowIso
  ).run();

  await recordAuditLog(db, null, 'agreement_signed_by_client', 'agreement', agreement.id, {
    signer_name,
    signing_method,
    newAgreementStatus,
    docHash
  }, ip, ua);

  return c.json({
    success: true,
    message: newAgreementStatus === 'fully_signed' 
      ? 'Agreement fully signed by all parties!' 
      : 'Signature recorded successfully. Waiting for designer countersignature.',
    agreementStatus: newAgreementStatus
  });
});
