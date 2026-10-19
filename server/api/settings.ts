// server/api/settings.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { authMiddleware, recordAuditLog } from '../auth/middleware';
import { AppEnv } from '../types';

export const settingsApp = new Hono<AppEnv>();
settingsApp.use('*', authMiddleware);

settingsApp.get('/business', async (c) => {
  const db = getDatabase(c.env);
  const rows = await db.prepare(`SELECT key, value, updated_at FROM business_settings`).all<any>();
  const settings: Record<string, string> = {};
  for (const row of rows.results) {
    settings[row.key] = row.value;
  }
  return c.json({ success: true, settings });
});

settingsApp.patch('/business', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const db = getDatabase(c.env);
  const user = c.get('user');
  const now = new Date().toISOString();

  for (const [key, val] of Object.entries(body)) {
    await db.prepare(`
      INSERT INTO business_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).bind(key, String(val ?? ''), now).run();
  }

  await recordAuditLog(db, user.id, 'business_settings_updated', 'settings', 'business', body);

  const updatedRows = await db.prepare(`SELECT key, value FROM business_settings`).all<any>();
  const settings: Record<string, string> = {};
  for (const row of updatedRows.results) {
    settings[row.key] = row.value;
  }
  return c.json({ success: true, message: 'Settings saved successfully', settings });
});

settingsApp.get('/templates', async (c) => {
  const db = getDatabase(c.env);
  const rows = await db.prepare(`SELECT * FROM document_templates ORDER BY type ASC, created_at DESC`).all<any>();
  return c.json({ success: true, templates: rows.results });
});

settingsApp.patch('/templates/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { name, content, is_default } = body;
  const db = getDatabase(c.env);
  const user = c.get('user');
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE document_templates
    SET name = COALESCE(?, name),
        content = COALESCE(?, content),
        is_default = COALESCE(?, is_default),
        updated_at = ?
    WHERE id = ?
  `).bind(name || null, content || null, is_default !== undefined ? (is_default ? 1 : 0) : null, now, id).run();

  await recordAuditLog(db, user.id, 'template_updated', 'template', id, { name });

  const updated = await db.prepare(`SELECT * FROM document_templates WHERE id = ?`).bind(id).first();
  return c.json({ success: true, template: updated });
});
