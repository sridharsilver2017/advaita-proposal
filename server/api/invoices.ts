// server/api/invoices.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { getStorage } from '../storage/index';
import { generateInvoicePdf } from '../pdf/generator';
import { authMiddleware, recordAuditLog } from '../auth/middleware';
import { AppEnv } from '../types';

export const invoicesApp = new Hono<AppEnv>();
invoicesApp.use('*', authMiddleware);

invoicesApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const status = c.req.query('status');
  const clientId = c.req.query('client_id');
  const agreementId = c.req.query('agreement_id');

  let query = `
    SELECT inv.*, c.name as client_name, c.email as client_email,
           agr.agreement_number, pr.proposal_number, p.name as project_name
    FROM invoices inv
    JOIN clients c ON inv.client_id = c.id
    JOIN agreements agr ON inv.agreement_id = agr.id
    JOIN proposals pr ON inv.proposal_id = pr.id
    JOIN projects p ON inv.project_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ` AND inv.status = ?`;
    params.push(status);
  }
  if (clientId) {
    query += ` AND inv.client_id = ?`;
    params.push(clientId);
  }
  if (agreementId) {
    query += ` AND inv.agreement_id = ?`;
    params.push(agreementId);
  }

  query += ` ORDER BY inv.created_at DESC`;
  const result = await db.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, invoices: result.results });
});

// POST /api/invoices (Generate Invoice from Executed Agreement)
invoicesApp.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    agreement_id,
    milestone_name = 'Engagement Initial Advance / Full Settlement',
    issue_date,
    due_date,
    items = [],
    tax_enabled = false,
    payment_instructions,
    terms,
    footer_notes,
    idempotency_key
  } = body;

  if (!agreement_id) {
    return c.json({ success: false, error: 'Agreement ID is required.' }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');

  // CRITICAL WORKFLOW ENFORCEMENT PRECONDITIONS:
  // 1. Fetch Agreement and verify status
  const agreement = await db.prepare(`
    SELECT a.*, c.name as client_name, c.email as client_email, c.billing_address as client_address,
           pr.proposal_number, p.name as project_name
    FROM agreements a
    JOIN clients c ON a.client_id = c.id
    JOIN proposals pr ON a.proposal_id = pr.id
    JOIN projects p ON a.project_id = p.id
    WHERE a.id = ?
  `).bind(agreement_id).first<any>();

  if (!agreement) {
    return c.json({ success: false, error: 'Agreement not found.' }, 404);
  }

  // PRECONDITION 1 & 3: Must be in 'executed' state!
  if (agreement.status !== 'executed') {
    return c.json({
      success: false,
      error: `PRECONDITION VIOLATION: Invoices can ONLY be generated after the agreement is fully executed. Current agreement status: '${agreement.status}'. Both client and designer must complete signatures first.`
    }, 400);
  }

  // PRECONDITION 4: Verify all signers have signed
  const signers = await db.prepare(`SELECT * FROM agreement_signers WHERE agreement_id = ?`).bind(agreement_id).all<any>();
  const unsigned = signers.results.filter((s: any) => s.status !== 'signed');
  if (unsigned.length > 0 && agreement.signing_method !== 'physical') {
    return c.json({
      success: false,
      error: 'Cannot generate invoice: Unsigned parties remain on the agreement.'
    }, 400);
  }

  // Idempotency check
  if (idempotency_key) {
    const existing = await db.prepare(`SELECT * FROM idempotency_keys WHERE key = ?`).bind(idempotency_key).first<any>();
    if (existing) {
      return c.json(JSON.parse(existing.response_body), existing.response_code);
    }
  }

  // Fetch agreement version details
  const agrVersion = await db.prepare(`
    SELECT * FROM agreement_versions WHERE agreement_id = ? AND version_number = ?
  `).bind(agreement.id, agreement.current_version).first<any>();

  // Fetch business settings
  const settingsRows = await db.prepare(`SELECT key, value FROM business_settings`).all<any>();
  const settings: Record<string, string> = {};
  for (const row of settingsRows.results) {
    settings[row.key] = row.value;
  }

  // Validate or build items
  let processedItems = items;
  if (!items || items.length === 0) {
    // Default to the agreed price from the executed agreement
    processedItems = [{
      position: 0,
      description: `${agrVersion.deliverables || 'Design and Development Services'} (${milestone_name})`,
      quantity: 1,
      unit: 'milestone',
      rate: agrVersion.price,
      discount: 0,
      amount: agrVersion.price
    }];
  }

  let subtotal = 0;
  for (const item of processedItems) {
    const qty = Math.max(0, Number(item.quantity) || 1);
    const rate = Math.max(0, Number(item.rate) || 0);
    const disc = Math.max(0, Number(item.discount) || 0);
    item.amount = Math.max(0, (qty * rate) - disc);
    subtotal += item.amount;
  }

  const overallDiscount = Math.max(0, Number(body.discounts) || 0);
  let taxAmount = 0;
  let taxRate = 0;

  // Non-GST by default as required
  const isGstEnabled = tax_enabled === true || (tax_enabled !== false && settings.gst_enabled === 'true');
  if (isGstEnabled) {
    taxRate = Number(settings.gst_rate) || 18;
    taxAmount = ((subtotal - overallDiscount) * taxRate) / 100;
  }

  const totalPayable = Math.max(0, (subtotal - overallDiscount) + taxAmount);
  const now = new Date();
  const nowIso = now.toISOString();
  const issueDateStr = issue_date || now.toISOString().split('T')[0];
  const dueDateStr = due_date || new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

  // Atomic Invoice Numbering: AD-INV-YYYY-XXXX
  const currentYear = now.getFullYear();
  const countRow = await db.prepare(`
    SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?
  `).bind(`AD-INV-${currentYear}-%`).first<{ count: number }>();
  const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
  const invoiceNumber = `AD-INV-${currentYear}-${seq}`;

  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // 1. Insert Invoice
  await db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, agreement_id, proposal_id, project_id, client_id,
      issue_date, due_date, status, currency, subtotal, discounts,
      tax_enabled, tax_name, tax_rate, tax_amount, total_payable, amount_paid,
      balance_due, payment_instructions, terms, footer_notes, milestone_name,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued', 'INR', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    invoiceId,
    invoiceNumber,
    agreement.id,
    agreement.proposal_id,
    agreement.project_id,
    agreement.client_id,
    issueDateStr,
    dueDateStr,
    subtotal,
    overallDiscount,
    isGstEnabled ? 1 : 0,
    isGstEnabled ? 'GST' : 'None',
    taxRate,
    taxAmount,
    totalPayable,
    totalPayable, // initial balance_due = totalPayable
    payment_instructions || `Bank Transfer / UPI (${settings.upi_id || 'advaita@okhdfcbank'})`,
    terms || 'Payment is strictly due within 7 days of invoice date.',
    footer_notes || settings.document_footer || 'Advaita Designs — Confidential',
    milestone_name,
    nowIso,
    nowIso
  ).run();

  // 2. Insert Invoice Items
  for (let i = 0; i < processedItems.length; i++) {
    const item = processedItems[i];
    const itemId = `inv_item_${Date.now()}_${i}`;
    await db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, position, description, quantity, unit, rate, discount, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      itemId,
      invoiceId,
      i,
      item.description,
      item.quantity || 1,
      item.unit || 'unit',
      item.rate,
      item.discount || 0,
      item.amount
    ).run();
  }

  // 3. Generate PDF and store in R2
  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    agreementNumber: agreement.agreement_number,
    proposalNumber: agreement.proposal_number,
    projectName: agreement.project_name,
    issueDate: issueDateStr,
    dueDate: dueDateStr,
    clientName: agreement.client_name,
    clientAddress: agreement.client_address,
    clientEmail: agreement.client_email,
    items: processedItems,
    subtotal,
    discounts: overallDiscount,
    taxEnabled: isGstEnabled,
    taxRate,
    taxAmount,
    totalPayable,
    amountPaid: 0,
    balanceDue: totalPayable,
    paymentInstructions: payment_instructions,
    terms,
    businessSettings: settings
  });

  const storage = getStorage(c.env);
  const r2Key = `invoices/${invoiceNumber}.pdf`;
  const stored = await storage.put(r2Key, pdfBytes, 'application/pdf');

  // Insert document record
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO documents (id, entity_type, entity_id, file_name, file_size, mime_type, r2_key, sha256_hash, created_at)
    VALUES (?, 'invoice', ?, ?, ?, 'application/pdf', ?, ?, ?)
  `).bind(docId, invoiceId, `${invoiceNumber}.pdf`, stored.size, stored.key, stored.sha256, nowIso).run();

  await recordAuditLog(db, user.id, 'invoice_generated', 'invoice', invoiceId, {
    invoiceNumber,
    agreementNumber: agreement.agreement_number,
    totalPayable,
    pdfKey: stored.key
  });

  const responsePayload = {
    success: true,
    message: `Invoice ${invoiceNumber} created and issued successfully.`,
    invoice: {
      id: invoiceId,
      invoice_number: invoiceNumber,
      total_payable: totalPayable,
      balance_due: totalPayable,
      status: 'issued',
      pdfUrl: stored.key
    }
  };

  // Record idempotency key if provided
  if (idempotency_key) {
    const exp = new Date(now.getTime() + 86400000).toISOString();
    await db.prepare(`
      INSERT INTO idempotency_keys (key, endpoint, response_code, response_body, created_at, expires_at)
      VALUES (?, '/api/invoices', 201, ?, ?, ?)
    `).bind(idempotency_key, JSON.stringify(responsePayload), nowIso, exp).run();
  }

  return c.json(responsePayload, 201);
});

// GET /api/invoices/:id
invoicesApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDatabase(c.env);

  const invoice = await db.prepare(`
    SELECT inv.*, c.name as client_name, c.email as client_email, c.billing_address as client_address,
           c.phone as client_phone, agr.agreement_number, pr.proposal_number, p.name as project_name
    FROM invoices inv
    JOIN clients c ON inv.client_id = c.id
    JOIN agreements agr ON inv.agreement_id = agr.id
    JOIN proposals pr ON inv.proposal_id = pr.id
    JOIN projects p ON inv.project_id = p.id
    WHERE inv.id = ?
  `).bind(id).first<any>();

  if (!invoice) {
    return c.json({ success: false, error: 'Invoice not found.' }, 404);
  }

  const items = await db.prepare(`
    SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY position ASC
  `).bind(id).all<any>();

  const payments = await db.prepare(`
    SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC
  `).bind(id).all<any>();

  return c.json({
    success: true,
    invoice: {
      ...invoice,
      items: items.results,
      payments: payments.results
    }
  });
});

// POST /api/invoices/:id/payments (Record manual or verified payment)
invoicesApp.post('/:id/payments', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const {
    amount,
    payment_date,
    payment_method = 'upi',
    transaction_reference,
    notes
  } = body;

  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    return c.json({ success: false, error: 'Payment amount must be greater than zero.' }, 400);
  }

  const db = getDatabase(c.env);
  const user = c.get('user');

  const invoice = await db.prepare(`SELECT * FROM invoices WHERE id = ?`).bind(id).first<any>();
  if (!invoice) {
    return c.json({ success: false, error: 'Invoice not found.' }, 404);
  }

  if (['cancelled', 'paid'].includes(invoice.status)) {
    return c.json({ success: false, error: `Cannot record payment for invoice with status '${invoice.status}'.` }, 400);
  }

  // Business Rule: Prevent payments greater than outstanding balance!
  if (paymentAmount > invoice.balance_due + 0.01) {
    return c.json({
      success: false,
      error: `Payment amount (${paymentAmount}) exceeds outstanding balance due (${invoice.balance_due}).`
    }, 400);
  }

  const nowIso = new Date().toISOString();
  const payDateStr = payment_date || nowIso.split('T')[0];
  const newAmountPaid = invoice.amount_paid + paymentAmount;
  const newBalanceDue = Math.max(0, invoice.total_payable - newAmountPaid);
  const newStatus = newBalanceDue <= 0.01 ? 'paid' : 'partially_paid';

  // 1. Insert Payment
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO payments (id, invoice_id, client_id, project_id, payment_date, amount, payment_method, transaction_reference, notes, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    paymentId,
    id,
    invoice.client_id,
    invoice.project_id,
    payDateStr,
    paymentAmount,
    payment_method,
    transaction_reference?.trim() || null,
    notes?.trim() || null,
    user.name || 'Owner',
    nowIso
  ).run();

  // 2. Update Invoice balance and status
  await db.prepare(`
    UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ? WHERE id = ?
  `).bind(newAmountPaid, newBalanceDue, newStatus, nowIso, id).run();

  // 3. If fully paid, check if project can be completed or updated
  if (newStatus === 'paid') {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await db.prepare(`
      INSERT INTO notifications (id, type, title, message, entity_type, entity_id, is_read, created_at)
      VALUES (?, 'system', 'Invoice Paid in Full', ?, 'invoice', ?, 0, ?)
    `).bind(notifId, `Invoice ${invoice.invoice_number} has been settled in full!`, id, nowIso).run();
  }

  await recordAuditLog(db, user.id, 'payment_recorded', 'invoice', id, {
    paymentId,
    amount: paymentAmount,
    paymentMethod: payment_method,
    newStatus,
    newBalanceDue
  });

  return c.json({
    success: true,
    message: `Payment of INR ${paymentAmount.toLocaleString('en-IN')} successfully recorded.`,
    invoiceStatus: newStatus,
    amountPaid: newAmountPaid,
    balanceDue: newBalanceDue
  });
});
