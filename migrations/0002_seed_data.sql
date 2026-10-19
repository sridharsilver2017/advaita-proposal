-- Seed initial admin user
INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  'usr_admin_01',
  'admin@advaitadesigns.com',
  '5cd41ac9366a55ca92249e5e1916a8f2:8dac27894bccddcd471ef497f1e874e850b7a5df2d18f5d04ed2000d27c45266',
  'Advaita Designs Admin',
  'owner',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Seed default business settings
INSERT OR REPLACE INTO business_settings (key, value, updated_at) VALUES
('business_name', 'Advaita Designs', CURRENT_TIMESTAMP),
('logo_url', '/logos/advaita-logo.png', CURRENT_TIMESTAMP),
('logo_dark_url', '/logos/logo-dark.png', CURRENT_TIMESTAMP),
('tagline', 'Brand Identity, Digital Architecture & Design Systems', CURRENT_TIMESTAMP),
('contact_person', 'Sridhar Silver', CURRENT_TIMESTAMP),
('email', 'hello@advaitadesigns.com', CURRENT_TIMESTAMP),
('phone', '+91 98400 12345', CURRENT_TIMESTAMP),
('website', 'https://advaitadesigns.com', CURRENT_TIMESTAMP),
('address_line1', 'No. 42, Design Sanctuary, ECR', CURRENT_TIMESTAMP),
('city', 'Chennai', CURRENT_TIMESTAMP),
('state', 'Tamil Nadu', CURRENT_TIMESTAMP),
('postal_code', '600041', CURRENT_TIMESTAMP),
('country', 'India', CURRENT_TIMESTAMP),
('currency', 'INR', CURRENT_TIMESTAMP),
('date_format', 'DD/MM/YYYY', CURRENT_TIMESTAMP),
('number_format', 'en-IN', CURRENT_TIMESTAMP),
('document_footer', 'Advaita Designs — Confidential & Proprietary Engagement Terms', CURRENT_TIMESTAMP),
('signature_block', 'For Advaita Designs,\nAuthorized Signatory', CURRENT_TIMESTAMP),
('gst_enabled', 'false', CURRENT_TIMESTAMP),
('gstin', '', CURRENT_TIMESTAMP),
('pan', 'ABCDE1234F', CURRENT_TIMESTAMP),
('bank_name', 'HDFC Bank', CURRENT_TIMESTAMP),
('bank_account_name', 'Advaita Designs', CURRENT_TIMESTAMP),
('bank_account_number', '50200012345678', CURRENT_TIMESTAMP),
('bank_ifsc', 'HDFC0001234', CURRENT_TIMESTAMP),
('bank_branch', 'Thiruvanmiyur, Chennai', CURRENT_TIMESTAMP),
('upi_id', 'advaita@okhdfcbank', CURRENT_TIMESTAMP),
('invoice_prefix', 'AD-INV-', CURRENT_TIMESTAMP),
('proposal_prefix', 'AD-PROP-', CURRENT_TIMESTAMP),
('agreement_prefix', 'AD-AGR-', CURRENT_TIMESTAMP),
('default_proposal_validity_days', '14', CURRENT_TIMESTAMP),
('default_payment_terms_days', '7', CURRENT_TIMESTAMP);

-- Seed default document template
INSERT OR REPLACE INTO document_templates (id, type, name, content, is_default, created_at, updated_at)
VALUES (
  'tpl_standard_agreement',
  'agreement',
  'Standard Master Services Agreement',
  '1. PURPOSE & SCOPE OF SERVICES
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
This Agreement shall be governed by and construed in accordance with the laws of India, and the courts of Chennai, Tamil Nadu, India shall have exclusive jurisdiction over any disputes arising hereunder.',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
