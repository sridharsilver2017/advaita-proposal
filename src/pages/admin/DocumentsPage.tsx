// src/pages/admin/DocumentsPage.tsx
import React, { useEffect, useState } from 'react';
import { Files, Download, Search, ShieldCheck, FileText } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatDateTime } from '../../lib/formatters';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    try {
      const res = await apiRequest('/api/documents');
      if (res.success) {
        setDocuments(res.documents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = documents.filter(d => {
    if (!search) return true;
    return (
      d.file_name.toLowerCase().includes(search.toLowerCase()) ||
      d.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      d.sha256_hash.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Document Vault</h1>
        <p className="text-xs text-stone-500 mt-0.5">Secure Cloudflare R2 file storage with cryptographic SHA-256 verification</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by file name, document type or SHA-256 hash..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading document vault...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400">
            <Files className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            No documents stored yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Seal</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-stone-400" />
                        <span className="font-semibold text-stone-900">{d.file_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize text-stone-600 font-medium">
                      {d.entity_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {Math.round(d.file_size / 1024)} KB
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {d.sha256_hash.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {formatDateTime(d.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/api/documents/download/${encodeURIComponent(d.r2_key)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
