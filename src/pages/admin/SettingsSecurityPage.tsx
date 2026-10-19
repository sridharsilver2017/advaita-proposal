// src/pages/admin/SettingsSecurityPage.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, Lock, Key, Database, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsSecurityPage: React.FC = () => {
  const { user } = useAuth();

  const navLinks = [
    { name: 'Business & Brand', href: '/settings/business' },
    { name: 'Document Templates', href: '/settings/templates' },
    { name: 'Workflow Rules', href: '/settings/workflow' },
    { name: 'Security & Access', href: '/settings/security' }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Settings</h1>
        <p className="text-xs text-stone-500 mt-0.5">Authentication parameters, cryptographic hashing and client portal access control</p>
      </div>

      <div className="border-b border-stone-200 flex gap-6 text-xs font-medium">
        {navLinks.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.href}
            className={({ isActive }) =>
              `py-2.5 border-b-2 transition ${
                isActive
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`
            }
          >
            {tab.name}
          </NavLink>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <Lock className="w-4 h-4 text-stone-500" />
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Admin Authentication
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Active Owner</span>
              <p className="font-semibold text-stone-900">{user?.name} ({user?.email})</p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Password Hashing Standard</span>
              <p className="text-stone-700">PBKDF2 with SHA-256 and 100,000 salt iterations (WebCrypto API).</p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Session Mechanism</span>
              <p className="text-stone-700">7-day revocable HTTP-only cookies with high-entropy token verification.</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <Globe className="w-4 h-4 text-stone-500" />
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Client Portal Protection
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Access Model</span>
              <p className="text-stone-700">256-bit high-entropy unguessable token scoped strictly to each client engagement.</p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Token Expiration</span>
              <p className="text-stone-700">Default 14-day token validity with automatic revocation and expiration verification.</p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Anti-Abuse</span>
              <p className="text-stone-700">Cloudflare Turnstile adapter support for remote electronic signature protection.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
