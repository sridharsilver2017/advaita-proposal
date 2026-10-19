// server/api/documents.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { getStorage } from '../storage/index';
import { AppEnv } from '../types';

export const documentsApp = new Hono<AppEnv>();

documentsApp.get('/', async (c) => {
  const db = getDatabase(c.env);
  const entityType = c.req.query('entity_type');
  const entityId = c.req.query('entity_id');

  let query = `SELECT * FROM documents WHERE 1=1`;
  const params: any[] = [];

  if (entityType) {
    query += ` AND entity_type = ?`;
    params.push(entityType);
  }
  if (entityId) {
    query += ` AND entity_id = ?`;
    params.push(entityId);
  }

  query += ` ORDER BY created_at DESC`;
  const result = await db.prepare(query).bind(...params).all<any>();
  return c.json({ success: true, documents: result.results });
});

documentsApp.get('/download/:key', async (c) => {
  const key = c.req.param('key');
  const storage = getStorage(c.env);
  const file = await storage.get(key);

  if (!file) {
    return c.json({ success: false, error: 'Document file not found in storage.' }, 404);
  }

  // Sanitize filename for download header
  const fileName = key.split('/').pop() || 'document.pdf';
  c.header('Content-Type', file.mimeType || 'application/pdf');
  c.header('Content-Disposition', `inline; filename="${fileName}"`);
  c.header('X-Document-SHA256', file.sha256Hash);

  return c.body(file.data as any);
});
