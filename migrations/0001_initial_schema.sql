-- Migration: 0001_initial_schema.sql
-- Advaita Designs Client Proposal, Agreement & Invoice System

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'company', -- 'individual' or 'company'
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  billing_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'India',
  tax_id TEXT, -- Optional GSTIN/PAN/Tax ID
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'archived'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  description TEXT,
  service_category TEXT,
  start_date TEXT,
  expected_completion_date TEXT,
  status TEXT NOT NULL DEFAULT 'lead', -- 'lead','proposal_preparation','proposal_sent','awaiting_approval','agreement_pending','ready_to_start','in_progress','on_hold','completed','cancelled'
  internal_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  proposal_number TEXT UNIQUE NOT NULL, -- e.g. AD-PROP-2026-0001
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft','ready_to_send','sent','viewed','accepted','declined','expired','withdrawn','superseded'
  current_version INTEGER NOT NULL DEFAULT 1,
  portal_token TEXT UNIQUE NOT NULL,
  portal_token_expires_at TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 14,
  valid_until TEXT NOT NULL,
  sent_at TEXT,
  accepted_at TEXT,
  declined_at TEXT,
  decline_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_proposals_portal_token ON proposals(portal_token);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(project_id);

-- Proposal Versions
CREATE TABLE IF NOT EXISTS proposal_versions (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  introduction TEXT,
  client_requirements TEXT,
  project_objectives TEXT,
  scope_of_work TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  exclusions TEXT,
  timeline TEXT NOT NULL,
  milestones TEXT,
  revision_policy TEXT,
  client_responsibilities TEXT,
  freelancer_responsibilities TEXT,
  payment_schedule TEXT NOT NULL,
  additional_terms TEXT,
  closing_statement TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_version_unique ON proposal_versions(proposal_id, version_number);

-- Proposal Items
CREATE TABLE IF NOT EXISTS proposal_items (
  id TEXT PRIMARY KEY,
  proposal_version_id TEXT NOT NULL REFERENCES proposal_versions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'hours',
  rate REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  calculated_amount REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_proposal_items_version ON proposal_items(proposal_version_id);

-- Proposal Acceptances
CREATE TABLE IF NOT EXISTS proposal_acceptances (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  verification_method TEXT NOT NULL DEFAULT 'portal_token',
  ip_address TEXT,
  user_agent TEXT,
  acceptance_metadata TEXT,
  accepted_at TEXT NOT NULL
);

-- Agreements
CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  agreement_number TEXT UNIQUE NOT NULL, -- e.g. AD-AGR-2026-0001
  proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft','sent_for_signature','partially_signed','fully_signed','executed','declined','expired','superseded','cancelled'
  current_version INTEGER NOT NULL DEFAULT 1,
  signing_order TEXT NOT NULL DEFAULT 'client_first', -- 'client_first','freelancer_first','independent'
  signing_method TEXT NOT NULL DEFAULT 'electronic', -- 'electronic' or 'physical'
  physical_signed_doc_url TEXT,
  physical_signed_date TEXT,
  physical_uploader_id TEXT,
  executed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agreements_number ON agreements(agreement_number);
CREATE INDEX IF NOT EXISTS idx_agreements_proposal_id ON agreements(proposal_id);
CREATE INDEX IF NOT EXISTS idx_agreements_project_id ON agreements(project_id);

-- Agreement Versions
CREATE TABLE IF NOT EXISTS agreement_versions (
  id TEXT PRIMARY KEY,
  agreement_id TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  legal_terms TEXT NOT NULL,
  scope_of_work TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  timeline TEXT NOT NULL,
  price REAL NOT NULL,
  payment_milestones TEXT NOT NULL,
  revision_limits TEXT,
  ip_terms TEXT NOT NULL,
  confidentiality_terms TEXT NOT NULL,
  termination_conditions TEXT NOT NULL,
  dispute_resolution TEXT NOT NULL,
  governing_law TEXT NOT NULL DEFAULT 'Jurisdiction of Chennai, Tamil Nadu, India',
  effective_date TEXT NOT NULL,
  additional_clauses TEXT,
  document_hash TEXT,
  pdf_url TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_version_unique ON agreement_versions(agreement_id, version_number);

-- Agreement Signers
CREATE TABLE IF NOT EXISTS agreement_signers (
  id TEXT PRIMARY KEY,
  agreement_id TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  role TEXT NOT NULL, -- 'client' or 'freelancer'
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','signed','declined'
  signed_at TEXT,
  token TEXT UNIQUE,
  order_index INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_agreement_signers_token ON agreement_signers(token);

-- Signatures
CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  agreement_id TEXT NOT NULL REFERENCES agreements(id) ON DELETE RESTRICT,
  signer_id TEXT NOT NULL REFERENCES agreement_signers(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL,
  signing_method TEXT NOT NULL, -- 'drawn','typed','uploaded','physical'
  signature_image_data TEXT, -- Base64 or R2 key
  signed_name TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  verification_result TEXT,
  document_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signatures_agreement ON signatures(agreement_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL, -- e.g. AD-INV-2026-0001
  agreement_id TEXT NOT NULL REFERENCES agreements(id) ON DELETE RESTRICT,
  proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued', -- 'draft','issued','partially_paid','paid','overdue','cancelled','adjusted'
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal REAL NOT NULL DEFAULT 0,
  discounts REAL NOT NULL DEFAULT 0,
  tax_enabled INTEGER NOT NULL DEFAULT 0, -- 0 = non-GST default
  tax_name TEXT DEFAULT 'GST',
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_payable REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  payment_instructions TEXT,
  terms TEXT,
  footer_notes TEXT,
  milestone_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_agreement ON invoices(agreement_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'item',
  rate REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL, -- 'bank_transfer','upi','cash','cheque','gateway','other'
  transaction_reference TEXT,
  notes TEXT,
  recorded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'proposal','agreement','invoice','signed_copy'
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  r2_key TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'proposal_response','agreement_signed','invoice_overdue','action_required','system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read);

-- Email Events
CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','sent','failed'
  error_message TEXT,
  entity_type TEXT,
  entity_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Business Settings (Key-Value store)
CREATE TABLE IF NOT EXISTS business_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'proposal','agreement','invoice','email'
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Idempotency Keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  response_code INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
