// scripts/migrate.js
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = join(process.cwd(), '.data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'advaita_local.db');
const db = new DatabaseSync(dbPath);

console.log(`Applying migrations to ${dbPath}...`);
const migrationSql = readFileSync(join(process.cwd(), 'migrations', '0001_initial_schema.sql'), 'utf-8');
db.exec(migrationSql);
console.log('Migration 0001_initial_schema.sql applied successfully.');
