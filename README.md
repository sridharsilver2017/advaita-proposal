# Advaita Designs — Client Proposal, Agreement & Invoice System

Production-grade web application for **Advaita Designs**, a freelance design studio, to manage the entire client engagement lifecycle:
```
Lead → Client → Project → Proposal → Client Acceptance → Mutual Agreement → First Signature → Second Signature → Executed Agreement → Invoice → Payment Tracking → Project Completion
```

---

## 1. System Architecture

- **Frontend**: React 18, Vite, TypeScript (strict mode), Tailwind CSS v4, React Router, TanStack Query, Lucide React icons.
- **Backend & APIs**: Cloudflare Workers / Hono REST API framework with sub-millisecond response latency.
- **Relational Data**: Cloudflare D1 (production) / Native SQLite via `node:sqlite` (local development and automated testing).
- **Document & Asset Storage**: Cloudflare R2 (production) / Local Filesystem storage adapter (`.data/storage/`).
- **PDF Engine**: Pure vector PDF generation via `pdf-lib` creating A4 proposals, agreements, executed contracts with digital seals, and invoices.
- **Transactional Notifications**: Provider interface with native Resend support and fallback dev console logger.

---

## 2. Core Business Rules Enforced on Server

1. **Invoicing Guard**: An invoice cannot be generated before both parties have signed the agreement and it has been marked `executed`.
2. **Acceptance vs Agreement**: Proposal acceptance records legal client intent, but does *not* equate to a signed mutual agreement.
3. **Dual Signature Integrity**: An agreement cannot be marked executed after only one signature; both parties must sign independently or physically countersign.
4. **Immutable Snapshots**: Accepted proposals and executed agreements create immutable version records with cryptographic SHA-256 hashes.
5. **Deterministic Derivation**: Agreement terms are automatically derived from the accepted proposal deliverables, price, and milestones.
6. **Financial Precision**: Subtotals, non-GST default, milestone calculations, and payments are calculated and validated strictly on the server.
7. **Complete Audit Trail**: Every sensitive action (login, proposal sent, accepted, signed, countersigned, invoice created, payment recorded) is preserved in an immutable audit log.

---

## 3. Directory Structure

```
├── .data/                  # Local development SQLite database & document storage
├── logos/                  # Advaita Designs brand assets (PNG, WebP, SVG)
├── migrations/             # SQL migrations for Cloudflare D1
│   └── 0001_initial_schema.sql
├── public/                 # Static assets and brand logos
│   └── logos/
├── scripts/                # Database migration and seed scripts
│   ├── migrate.js
│   └── seed.js
├── server/                 # Cloudflare Workers & Hono backend
│   ├── api/                # Modular REST route handlers
│   │   ├── agreements.ts   # Dual-signature workflow & execution
│   │   ├── auth.ts         # Session login, logout, password hashing
│   │   ├── clients.ts      # Client management & CRM
│   │   ├── dashboard.ts    # Real-time operational metrics & pipeline
│   │   ├── documents.ts    # Authorized document streaming
│   │   ├── invoices.ts     # Invoicing with precondition guards
│   │   ├── payments.ts     # Partial & full payment recording
│   │   ├── portal.ts       # Token-secured client portal API
│   │   ├── projects.ts     # Engagements & stage progression
│   │   ├── proposals.ts    # Proposal builder & versioning
│   │   ├── reports.ts      # Revenue, acceptance, receivables reports
│   │   └── settings.ts     # Business profile & tax configuration
│   ├── auth/               # WebCrypto PBKDF2 hashing & session middleware
│   ├── db/                 # Dual-mode Cloudflare D1 / SQLite adapter
│   ├── email/              # Transactional email adapter (Resend)
│   ├── pdf/                # Vector A4 PDF generator
│   ├── storage/            # Cloudflare R2 / Filesystem storage adapter
│   ├── index.ts            # Central Hono router
│   └── types.ts            # Type definitions
├── src/                    # Frontend React SPA
│   ├── components/         # Accessible UI primitives & signature canvas
│   │   ├── common/         # Modal, StatusBadge
│   │   ├── layout/         # AdminLayout, PortalLayout
│   │   └── signature/      # SignaturePad (draw, type, upload + legal consent)
│   ├── pages/              # Admin application and client portal views
│   │   ├── admin/          # Dashboard, Clients, Proposals, Agreements, Invoices, Settings
│   │   └── portal/         # Token-protected client acceptance and signing views
│   ├── App.tsx             # Route definitions
│   └── main.tsx            # Application root
├── tests/                  # Integration and lifecycle tests
│   └── workflow.test.ts    # 16-step end-to-end automated lifecycle verification
├── wrangler.jsonc          # Cloudflare Workers, D1 & R2 configuration
└── vite.config.ts          # Vite build & local API middleware integration
```

---

## 4. Getting Started Locally

### Prerequisites
- Node.js v20+ or v24+
- npm v10+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Initialize Database & Seed Admin
```bash
# Run migrations to initialize local SQLite database
npm run db:migrate

# Seed the default admin user and business settings
npm run db:seed
```

### Step 3: Start Development Server
```bash
npm run dev
```
Open **`http://localhost:5174`** (or displayed port).

Default Administrator Credentials:
- **Email**: `admin@advaitadesigns.com`
- **Password**: `Password123!`

---

## 5. Running Tests

Run the comprehensive 16-step automated test suite covering all workflow steps, negative precondition checks, and financial rules:
```bash
npm test
```

---

## 6. Cloudflare Production Deployment

### 1. Initialize Cloudflare D1 Database
```bash
npx wrangler d1 create advaita-db
```
Copy the generated `database_id` into `wrangler.jsonc`.

Apply the database schema:
```bash
npx wrangler d1 execute advaita-db --file=migrations/0001_initial_schema.sql
```

### 2. Initialize Cloudflare R2 Bucket
```bash
npx wrangler r2 bucket create advaita-documents
```

### 3. Configure Secrets
Set the secure session secret and email API key:
```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put RESEND_API_KEY
```

### 4. Deploy Application
```bash
npm run build
npx wrangler deploy
```

---

## 7. External Integrations Configuration

### Transactional Email (Resend)
Set `RESEND_API_KEY` and `SENDER_EMAIL` in your environment or Cloudflare Worker secrets. If omitted, the application logs emails safely in development and presents copyable portal links in the UI.

### Electronic Signature Compliance
The built-in dual-signature engine captures:
- Signer full name & role
- Legal electronic signature intent disclosure
- Drawn vector canvas / typed disclosure
- Client IP address and browser User-Agent
- Cryptographic SHA-256 document hash
- Timestamps recorded in UTC

If a commercial e-signature provider (e.g., DocuSign, HelloSign) is required for specific enterprise compliance, implement the `ElectronicSignatureProvider` adapter interface defined in `server/types.ts`.

---

## 8. Financial & Invoicing Notes

- **Default Currency**: Indian Rupee (`INR` / `₹`), with configurable support for `USD`, `EUR`, `GBP`.
- **Non-GST Invoicing**: GST is disabled by default in business settings. Invoices clearly reflect non-taxable design retainers. If GST is enabled, GSTIN and tax rates can be configured in `/settings/business`.
- **Atomic Invoicing**: Invoice numbers (e.g. `AD-INV-2026-0001`) are allocated atomically on the server to prevent race conditions.
