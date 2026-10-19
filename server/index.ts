// server/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authApp } from './api/auth';
import { clientsApp } from './api/clients';
import { projectsApp } from './api/projects';
import { proposalsApp } from './api/proposals';
import { portalApp } from './api/portal';
import { agreementsApp } from './api/agreements';
import { invoicesApp } from './api/invoices';
import { paymentsApp } from './api/payments';
import { dashboardApp } from './api/dashboard';
import { settingsApp } from './api/settings';
import { reportsApp } from './api/reports';
import { documentsApp } from './api/documents';
import { AppEnv } from './types';

const app = new Hono<AppEnv>();

// Global CORS & Error Handling
app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Health Check
app.get('/api/health', (c) => c.json({
  status: 'healthy',
  service: 'Advaita Designs Client Proposal & Agreement System',
  timestamp: new Date().toISOString()
}));

// Mount API routes
app.route('/api/auth', authApp);
app.route('/api/clients', clientsApp);
app.route('/api/projects', projectsApp);
app.route('/api/proposals', proposalsApp);
app.route('/api/portal', portalApp);
app.route('/api/agreements', agreementsApp);
app.route('/api/invoices', invoicesApp);
app.route('/api/payments', paymentsApp);
app.route('/api/dashboard', dashboardApp);
app.route('/api/settings', settingsApp);
app.route('/api/reports', reportsApp);
app.route('/api/documents', documentsApp);

// 404 for undefined API endpoints
app.all('/api/*', (c) => c.json({ success: false, error: 'API endpoint not found' }, 404));

// SPA fallback for frontend client-side routes (e.g. /login, /dashboard, /portal/*)
app.get('*', async (c) => {
  if (c.env && (c.env as any).ASSETS) {
    const url = new URL(c.req.url);
    url.pathname = '/';
    return (c.env as any).ASSETS.fetch(new Request(url.toString(), c.req.raw));
  }
  return c.text('Not found', 404);
});

export default app;
