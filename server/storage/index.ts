// server/storage/index.ts
// Cloudflare R2 / Local Filesystem Storage Adapter
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '../auth/crypto';

export interface StorageObject {
  key: string;
  data: Uint8Array;
  mimeType: string;
  sha256Hash: string;
  size: number;
}

export interface StorageAdapter {
  put(key: string, data: Uint8Array | ArrayBuffer | string, mimeType?: string): Promise<{ key: string; sha256: string; size: number }>;
  get(key: string): Promise<StorageObject | null>;
  delete(key: string): Promise<boolean>;
}

class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(process.cwd(), '.data', 'storage');
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async put(key: string, data: Uint8Array | ArrayBuffer | string, mimeType: string = 'application/pdf'): Promise<{ key: string; sha256: string; size: number }> {
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array 
        ? data 
        : new Uint8Array(data);

    // Sanitize key to prevent path traversal
    const safeKey = key.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    const filePath = join(this.baseDir, safeKey);
    writeFileSync(filePath, bytes);

    const hash = await sha256(bytes);
    return {
      key: safeKey,
      sha256: hash,
      size: bytes.length
    };
  }

  async get(key: string): Promise<StorageObject | null> {
    const safeKey = key.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    const filePath = join(this.baseDir, safeKey);
    if (!existsSync(filePath)) {
      return null;
    }
    const buffer = readFileSync(filePath);
    const bytes = new Uint8Array(buffer);
    const hash = await sha256(bytes);

    return {
      key: safeKey,
      data: bytes,
      mimeType: safeKey.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      sha256Hash: hash,
      size: bytes.length
    };
  }

  async delete(key: string): Promise<boolean> {
    const safeKey = key.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    const filePath = join(this.baseDir, safeKey);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

class R2StorageAdapter implements StorageAdapter {
  constructor(private r2: any) {}

  async put(key: string, data: Uint8Array | ArrayBuffer | string, mimeType: string = 'application/pdf'): Promise<{ key: string; sha256: string; size: number }> {
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array 
        ? data 
        : new Uint8Array(data);

    const hash = await sha256(bytes);
    await this.r2.put(key, bytes, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { sha256: hash }
    });

    return {
      key,
      sha256: hash,
      size: bytes.length
    };
  }

  async get(key: string): Promise<StorageObject | null> {
    const obj = await this.r2.get(key);
    if (!obj) return null;
    const arrayBuffer = await obj.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const hash = obj.customMetadata?.sha256 || await sha256(bytes);

    return {
      key,
      data: bytes,
      mimeType: obj.httpMetadata?.contentType || 'application/pdf',
      sha256Hash: hash,
      size: bytes.length
    };
  }

  async delete(key: string): Promise<boolean> {
    await this.r2.delete(key);
    return true;
  }
}

let globalStorage: StorageAdapter | null = null;

export function getStorage(env?: { STORAGE?: any }): StorageAdapter {
  if (env && env.STORAGE) {
    return new R2StorageAdapter(env.STORAGE);
  }
  if (!globalStorage) {
    globalStorage = new LocalStorageAdapter();
  }
  return globalStorage;
}
