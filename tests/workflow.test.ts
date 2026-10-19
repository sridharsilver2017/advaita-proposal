// tests/workflow.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index';
import { getDatabase, LocalD1Database, setTestDatabase } from '../server/db/adapter';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashPassword } from '../server/auth/crypto';

describe('Advaita Designs - End-to-End Client Engagement Lifecycle', () => {
  let db: LocalD1Database;
  let authCookie: string;
  let clientId: string;
  let projectId: string;
  let proposalId: string;
  let portalToken: string;
  let agreementId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Initialize in-memory test database
    db = new LocalD1Database(':memory:');
    setTestDatabase(db);

    const schema = readFileSync(join(process.cwd(), 'migrations', '0001_initial_schema.sql'), 'utf-8');
    db.exec(schema);

    // Seed test admin user
    const passHash = await hashPassword('Password123!');
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES ('usr_test_01', 'admin@advaitadesigns.com', ?, 'Advaita Admin', 'owner', ?, ?)
    `).bind(passHash, now, now).run();

    // Seed business settings
    await db.prepare(`
      INSERT INTO business_settings (key, value, updated_at) VALUES ('business_name', 'Advaita Designs', ?)
    `).bind(now).run();
    await db.prepare(`
      INSERT INTO business_settings (key, value, updated_at) VALUES ('currency', 'INR', ?)
    `).bind(now).run();
  });

  it('1. Freelancer Authentication: logs in and receives session cookie', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@advaitadesigns.com',
        password: 'Password123!'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('advaita_session=');
    authCookie = setCookie || `advaita_session=${data.token}`;
  });

  it('2. Client Management: creates a new corporate design client', async () => {
    const res = await app.request('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        name: 'Zenith Retail Technologies',
        type: 'company',
        contact_person: 'Rahul Sharma',
        email: 'rahul@zenithretail.in',
        phone: '+91 98765 43210',
        billing_address: 'Brigade Tech Park, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        postal_code: '560066',
        country: 'India',
        notes: 'Premium omnichannel retail redesign'
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.client.id).toBeDefined();
    clientId = data.client.id;
  });

  it('3. Project Management: creates a linked project in "lead" status', async () => {
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        name: 'Zenith Design System & E-Commerce Overhaul',
        client_id: clientId,
        description: 'End-to-end design system, mobile UI/UX, and component guidelines',
        service_category: 'Design Systems',
        start_date: '2026-11-01',
        expected_completion_date: '2027-01-31',
        status: 'lead'
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.project.id).toBeDefined();
    projectId = data.project.id;
  });

  it('4. Proposal Builder: builds proposal with accurate financial calculation', async () => {
    const res = await app.request('/api/proposals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        client_id: clientId,
        project_id: projectId,
        title: 'Zenith Omnichannel Experience Architecture',
        introduction: 'Advaita Designs is pleased to submit this comprehensive proposal.',
        scope_of_work: 'Brand guidelines, Component token library, 40+ high fidelity screens in Figma.',
        deliverables: 'Design Tokens, Figma Design System, Mobile App prototypes.',
        timeline: '12 weeks milestone schedule.',
        payment_schedule: '50% advance upon contract signing, 50% upon final handoff.',
        discount: 10000,
        items: [
          { description: 'Design System & Component Kit', quantity: 1, rate: 100000 },
          { description: 'Responsive E-Commerce Flow UI/UX', quantity: 1, rate: 60000 }
        ]
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.proposal.proposal_number).toMatch(/^AD-PROP-\d{4}-\d{4}$/);
    expect(data.proposal.subtotal).toBe(160000);
    expect(data.proposal.discount).toBe(10000);
    expect(data.proposal.total).toBe(150000); // 160000 - 10000

    proposalId = data.proposal.id;
    portalToken = data.proposal.portal_token;
  });

  it('5. Proposal Dispatch: sends proposal, generates PDF, updates status to "sent"', async () => {
    const res = await app.request(`/api/proposals/${proposalId}/send`, {
      method: 'POST',
      headers: { 'Cookie': authCookie }
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.portalUrl).toContain(portalToken);

    // Verify database status
    const prop = await db.prepare('SELECT status, sent_at FROM proposals WHERE id = ?').bind(proposalId).first<any>();
    expect(prop.status).toBe('sent');
    expect(prop.sent_at).toBeDefined();
  });

  it('6. Client Portal: client views proposal and accepts terms explicitly', async () => {
    // 6a. Client accesses portal
    const viewRes = await app.request(`/api/portal/${portalToken}`);
    expect(viewRes.status).toBe(200);
    const viewData = await viewRes.json() as any;
    expect(viewData.success).toBe(true);
    expect(viewData.portal.proposal.number).toBeDefined();

    // 6b. Client explicitly accepts
    const acceptRes = await app.request(`/api/portal/${portalToken}/proposal/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Rahul Sharma',
        client_email: 'rahul@zenithretail.in',
        confirm_acceptance: true
      })
    });

    expect(acceptRes.status).toBe(200);
    const acceptData = await acceptRes.json() as any;
    expect(acceptData.success).toBe(true);

    // Verify proposal status is accepted and version is locked
    const prop = await db.prepare('SELECT status, accepted_at FROM proposals WHERE id = ?').bind(proposalId).first<any>();
    expect(prop.status).toBe('accepted');
    expect(prop.accepted_at).toBeDefined();

    // Verify project status transitioned to agreement_pending
    const prj = await db.prepare('SELECT status FROM projects WHERE id = ?').bind(projectId).first<any>();
    expect(prj.status).toBe('agreement_pending');
  });

  it('7. Mutual Agreement: generates agreement derived from accepted proposal terms', async () => {
    const res = await app.request('/api/agreements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        proposal_id: proposalId,
        signing_order: 'client_first'
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.agreement.agreement_number).toMatch(/^AD-AGR-\d{4}-\d{4}$/);
    expect(data.agreement.status).toBe('draft');
    agreementId = data.agreement.id;

    // Send agreement for signature
    const sendRes = await app.request(`/api/agreements/${agreementId}/send`, {
      method: 'POST',
      headers: { 'Cookie': authCookie }
    });
    expect(sendRes.status).toBe(200);
  });

  it('8. Dual Signatures (Part 1): client signs first -> status is "partially_signed"', async () => {
    const res = await app.request(`/api/portal/${portalToken}/agreement/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_name: 'Rahul Sharma',
        signing_method: 'drawn',
        signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        consent_text: 'I agree to be legally bound by this agreement and electronic signature.'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.agreementStatus).toBe('partially_signed');

    // Rule #3 Verification: Agreement is NOT executed after only one signature!
    const agr = await db.prepare('SELECT status, executed_at FROM agreements WHERE id = ?').bind(agreementId).first<any>();
    expect(agr.status).toBe('partially_signed');
    expect(agr.executed_at).toBeNull();
  });

  it('9. PRECONDITION RULE 1 CHECK: Invoice creation is strictly BLOCKED while partially signed', async () => {
    const res = await app.request('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        agreement_id: agreementId,
        milestone_name: '50% Project Advance'
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('PRECONDITION VIOLATION');
  });

  it('10. Dual Signatures (Part 2): freelancer countersigns -> status becomes "fully_signed"', async () => {
    const res = await app.request(`/api/agreements/${agreementId}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        signer_name: 'Advaita Designs Admin',
        signing_method: 'drawn',
        signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        consent_text: 'For Advaita Designs, Authorized Signatory.'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.status).toBe('fully_signed');
  });

  it('11. Agreement Finalization: marks agreement "executed" with document hash', async () => {
    const res = await app.request(`/api/agreements/${agreementId}/finalize`, {
      method: 'POST',
      headers: { 'Cookie': authCookie }
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.agreementStatus).toBe('executed');
    expect(data.documentHash).toBeDefined();

    const agr = await db.prepare('SELECT status, executed_at FROM agreements WHERE id = ?').bind(agreementId).first<any>();
    expect(agr.status).toBe('executed');
    expect(agr.executed_at).toBeDefined();
  });

  it('12. Invoice Generation: succeeds now that agreement is executed', async () => {
    const res = await app.request('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        agreement_id: agreementId,
        milestone_name: '50% Advance Milestone Payment',
        items: [
          { description: 'Advance 50% for Zenith Design Architecture', quantity: 1, rate: 75000 }
        ]
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.invoice.invoice_number).toMatch(/^AD-INV-\d{4}-\d{4}$/);
    expect(data.invoice.total_payable).toBe(75000);
    expect(data.invoice.balance_due).toBe(75000);
    expect(data.invoice.status).toBe('issued');
    invoiceId = data.invoice.id;
  });

  it('13. Negative Rule: Reject payment amount greater than outstanding balance', async () => {
    const res = await app.request(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        amount: 80000, // exceeds 75000 balance!
        payment_method: 'bank_transfer'
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('exceeds outstanding balance');
  });

  it('14. Payment Recording: partial payment updates status to "partially_paid"', async () => {
    const res = await app.request(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        amount: 40000,
        payment_method: 'upi',
        transaction_reference: 'UPI/6291039103'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.invoiceStatus).toBe('partially_paid');
    expect(data.amountPaid).toBe(40000);
    expect(data.balanceDue).toBe(35000);
  });

  it('15. Payment Settlement: remaining payment settles invoice to "paid"', async () => {
    const res = await app.request(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        amount: 35000,
        payment_method: 'bank_transfer',
        transaction_reference: 'NEFT/HDFC/992019'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.invoiceStatus).toBe('paid');
    expect(data.balanceDue).toBe(0);
  });

  it('16. Audit Trail: verifies all lifecycle operations were recorded', async () => {
    const logs = await db.prepare('SELECT action FROM audit_logs').all<any>();
    const actions = logs.results.map((l: any) => l.action);

    expect(actions).toContain('client_created');
    expect(actions).toContain('project_created');
    expect(actions).toContain('proposal_created');
    expect(actions).toContain('proposal_sent');
    expect(actions).toContain('proposal_accepted');
    expect(actions).toContain('agreement_generated');
    expect(actions).toContain('agreement_signed_by_client');
    expect(actions).toContain('agreement_signed_by_freelancer');
    expect(actions).toContain('agreement_executed');
    expect(actions).toContain('invoice_generated');
    expect(actions).toContain('payment_recorded');
  });
});
