// server/db/adapter.ts
// Dual-mode D1 interface: works with Cloudflare D1 in production and node:sqlite in local dev / testing.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

function getDatabaseSync() {
  try {
    const url = (typeof import.meta !== 'undefined' && import.meta.url) ? import.meta.url : 'file:///app/index.js';
    const req = createRequire(url);
    return req('node:sqlite').DatabaseSync;
  } catch {
    return null;
  }
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: any }>;
  run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

class LocalD1PreparedStatement implements D1PreparedStatement {
  private stmt: any;
  private boundValues: any[] = [];

  constructor(private db: any, private sql: string) {
    this.stmt = db.prepare(sql);
  }

  bind(...values: any[]): D1PreparedStatement {
    this.boundValues = values.map(v => (v === undefined ? null : v));
    return this;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const row = this.stmt.get(...this.boundValues);
    if (!row) return null;
    if (colName) return (row as any)[colName] ?? null;
    return row as T;
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: any }> {
    const rows = this.stmt.all(...this.boundValues);
    return {
      results: (rows || []) as T[],
      success: true,
      meta: { changes: 0 }
    };
  }

  async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }> {
    const info = this.stmt.run(...this.boundValues);
    return {
      success: true,
      meta: {
        changes: info?.changes ?? 0,
        last_row_id: Number(info?.lastInsertRowid ?? 0)
      }
    };
  }
}

export class LocalD1Database implements D1Database {
  private db: any;

  constructor(dbPath: string = ':memory:') {
    if (dbPath !== ':memory:') {
      const dir = join(dbPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
    const DatabaseSync = getDatabaseSync();
    if (!DatabaseSync) {
      throw new Error('Local SQLite is only supported in Node.js environments. In Cloudflare Workers, bind a D1 database to env.DB.');
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  prepare(query: string): D1PreparedStatement {
    return new LocalD1PreparedStatement(this.db, query);
  }

  async batch(statements: D1PreparedStatement[]): Promise<any[]> {
    const results: any[] = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
    return results;
  }

  async exec(query: string): Promise<any> {
    return this.db.exec(query);
  }

  getNativeDb(): any {
    return this.db;
  }
}

let globalDb: D1Database | null = null;

export function getDatabase(env?: { DB?: D1Database }): D1Database {
  if (env && env.DB) {
    return env.DB;
  }
  if (!globalDb) {
    const dbPath = process.env.NODE_ENV === 'test' 
      ? ':memory:' 
      : join(process.cwd(), '.data', 'advaita_local.db');
    globalDb = new LocalD1Database(dbPath);
  }
  return globalDb;
}

export function setTestDatabase(db: D1Database) {
  globalDb = db;
}
