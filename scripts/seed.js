// scripts/seed.js
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from '../server/auth/crypto.ts';

const dbPath = join(process.cwd(), '.data', 'advaita_local.db');
const db = new DatabaseSync(dbPath);

async function seed() {
  console.log('Seeding initial data...');
  const now = new Date().toISOString();

  // 1. Seed Owner User
  const adminId = 'usr_admin_01';
  const email = 'admin@advaitadesigns.com';
  const passwordHash = await hashPassword('Password123!');
  
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, email, passwordHash, 'Advaita Designs Admin', 'owner', now, now);

  // 2. Business Settings
  const settings = {
    business_name: 'Advaita Designs',
    logo_url: '/logos/advaita-logo.png',
    logo_dark_url: '/logos/logo-dark.png',
    tagline: 'Brand Identity, Digital Architecture & Design Systems',
    contact_person: 'Sridhar Silver',
    email: 'hello@advaitadesigns.com',
    phone: '+91 98400 12345',
    website: 'https://advaitadesigns.com',
    address_line1: 'No. 42, Design Sanctuary, ECR',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postal_code: '600041',
    country: 'India',
    currency: 'INR',
    date_format: 'DD/MM/YYYY',
    number_format: 'en-IN',
    document_footer: 'Advaita Designs — Confidential & Proprietary Engagement Terms',
    signature_block: 'For Advaita Designs,\nAuthorized Signatory',
    gst_enabled: 'false',
    gstin: '',
    pan: 'ABCDE1234F',
    bank_name: 'HDFC Bank',
    bank_account_name: 'Advaita Designs',
    bank_account_number: '50200012345678',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Thiruvanmiyur, Chennai',
    upi_id: 'advaita@okhdfcbank',
    invoice_prefix: 'AD-INV-',
    proposal_prefix: 'AD-PROP-',
    agreement_prefix: 'AD-AGR-',
    default_proposal_validity_days: '14',
    default_payment_terms_days: '7'
  };

  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO business_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  for (const [key, value] of Object.entries(settings)) {
    insertSetting.run(key, value, now);
  }

  // 3. Document Templates
  const defaultAgreementTemplate = `
1. PURPOSE & SCOPE OF SERVICES
Advaita Designs ("Designer") agrees to perform the professional design and consulting services set forth in the accepted Proposal reference {{proposal_number}} for {{client_name}} ("Client").

2. COMPENSATION & PAYMENT TERMS
Client agrees to pay the fees in accordance with the payment milestones outlined in the agreed Proposal. Invoices are payable within 7 business days of issuance. Work on subsequent milestones is contingent upon receipt of prior milestone compensation.

3. INTELLECTUAL PROPERTY RIGHTS
Upon full and final payment of all invoices due under this Agreement, the Designer assigns to the Client all right, title, and interest in and to the final approved Deliverables created specifically for the Client. Designer retains the right to display the work in portfolio exhibitions and design publications. Preliminary concepts and rejected iterations remain Designer property.

4. CLIENT RESPONSIBILITIES & REVISIONS
Client shall provide timely feedback and necessary materials. Standard engagement covers up to two (2) rounds of revisions per milestone. Additional revisions or alterations requested beyond scope will be billed at standard hourly rates upon mutual written consent.

5. CONFIDENTIALITY
Both parties agree to treat all proprietary information, trade secrets, and non-public business details disclosed during this engagement as strictly confidential.

6. TERMINATION
Either party may terminate this agreement with 14 calendar days written notice. In the event of termination, Client shall compensate Designer for all work performed and approved expenses incurred up to the date of notice.

7. GOVERNING LAW & JURISDICTION
This Agreement shall be governed by and construed in accordance with the laws of India, and the courts of Chennai, Tamil Nadu, India shall have exclusive jurisdiction over any disputes arising hereunder.
  `.trim();

  db.prepare(`
    INSERT OR REPLACE INTO document_templates (id, type, name, content, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('tmpl_agreement_default', 'agreement', 'Standard Design Agreement Terms', defaultAgreementTemplate, 1, now, now);

  console.log('Database seeded successfully.');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
