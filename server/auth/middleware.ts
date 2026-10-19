// server/auth/middleware.ts
import { Context, Next } from 'hono';
import { getDatabase } from '../db/adapter';
import { AppEnv } from '../types';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Check cookie
    const cookies = c.req.header('Cookie');
    if (cookies) {
      const match = cookies.match(/advaita_session=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) {
    return c.json({ success: false, error: 'Unauthorized: Session missing' }, 401);
  }

  const db = getDatabase(c.env);
  const now = new Date().toISOString();

  // Find active session
  const session = await db.prepare(`
    SELECT s.*, u.email, u.name, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(token, now).first<any>();

  if (!session) {
    return c.json({ success: false, error: 'Unauthorized: Session expired or invalid' }, 401);
  }

  // Set user context
  c.set('user', {
    id: session.user_id,
    email: session.email,
    name: session.name,
    role: session.role,
    sessionId: session.id
  });

  await next();
}

export async function recordAuditLog(
  db: any,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
) {
  const id = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    action,
    entityType,
    entityId,
    metadata ? JSON.stringify(metadata) : null,
    ipAddress || null,
    userAgent || null,
    now
  ).run();
}
