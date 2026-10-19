// server/api/auth.ts
import { Hono } from 'hono';
import { getDatabase } from '../db/adapter';
import { verifyPassword, generateToken } from '../auth/crypto';
import { recordAuditLog, authMiddleware } from '../auth/middleware';
import { AppEnv } from '../types';

export const authApp = new Hono<AppEnv>();

authApp.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: 'Email and password are required' }, 400);
  }

  const db = getDatabase(c.env);
  const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email.toLowerCase().trim()).first<any>();

  if (!user) {
    return c.json({ success: false, error: 'Invalid email or password' }, 401);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid email or password' }, 401);
  }

  // Create session (valid for 7 days)
  const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const token = generateToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const ua = c.req.header('user-agent') || 'Unknown';

  await db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(sessionId, user.id, token, expiresAt, now.toISOString(), ip, ua).run();

  await recordAuditLog(db, user.id, 'login', 'user', user.id, { email: user.email }, ip, ua);

  // Set cookie
  c.header('Set-Cookie', `advaita_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`);

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

authApp.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDatabase(c.env);
  await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(user.sessionId).run();
  await recordAuditLog(db, user.id, 'logout', 'user', user.id);
  c.header('Set-Cookie', `advaita_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return c.json({ success: true, message: 'Logged out successfully' });
});

authApp.get('/session', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

authApp.post('/forgot-password', async (c) => {
  const { email } = await c.req.json().catch(() => ({}));
  if (!email) return c.json({ success: false, error: 'Email is required' }, 400);

  const db = getDatabase(c.env);
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
  if (user) {
    await recordAuditLog(db, null, 'forgot_password_requested', 'user', (user as any).id, { email });
  }
  return c.json({
    success: true,
    message: 'If the email exists in our system, password reset instructions have been dispatched.'
  });
});
