// server/types.ts
import { D1Database } from './db/adapter';

export interface AppEnv {
  Bindings: {
    DB?: D1Database;
    STORAGE?: any;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  };
  Variables: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      sessionId: string;
    };
  };
}
