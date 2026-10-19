// server/email/index.ts
// Transactional email interface and adapters (Resend, SendGrid, and Dev/Mock logger)
import { D1Database } from '../db/adapter';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  entityType?: string;
  entityId?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export class MockEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log(`[Email Mock Provider] To: ${message.to} | Subject: ${message.subject}`);
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: 'mock'
    };
  }
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private fromAddress: string) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          error: `Resend error (${res.status}): ${errorText}`,
          provider: 'resend'
        };
      }

      const data = await res.json() as any;
      return {
        success: true,
        messageId: data?.id,
        provider: 'resend'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unknown network error sending email',
        provider: 'resend'
      };
    }
  }
}

export function getEmailProvider(env?: any): { provider: EmailProvider; isConfigured: boolean } {
  const apiKey = env?.RESEND_API_KEY || process.env.RESEND_API_KEY;
  const from = env?.EMAIL_FROM || process.env.EMAIL_FROM || 'Advaita Designs <proposals@advaitadesigns.com>';

  if (apiKey && apiKey.trim().length > 0) {
    return {
      provider: new ResendEmailProvider(apiKey, from),
      isConfigured: true
    };
  }

  return {
    provider: new MockEmailProvider(),
    isConfigured: false
  };
}

export async function logEmailEvent(
  db: D1Database,
  recipient: string,
  template: string,
  subject: string,
  status: 'sent' | 'failed',
  errorMessage: string | null,
  entityType?: string,
  entityId?: string
) {
  const now = new Date().toISOString();
  const id = `em_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await db.prepare(`
    INSERT INTO email_events (id, recipient, template, subject, status, error_message, entity_type, entity_id, created_at, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, recipient, template, subject, status, errorMessage, entityType ?? null, entityId ?? null, now, status === 'sent' ? now : null).run();
}
