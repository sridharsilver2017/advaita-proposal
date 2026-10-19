// src/pages/admin/SettingsWorkflowPage.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export const SettingsWorkflowPage: React.FC = () => {
  const navLinks = [
    { name: 'Business & Brand', href: '/settings/business' },
    { name: 'Document Templates', href: '/settings/templates' },
    { name: 'Workflow Rules', href: '/settings/workflow' },
    { name: 'Security & Access', href: '/settings/security' }
  ];

  const rules = [
    { id: 1, title: 'Invoice Block on Unexecuted Agreements', desc: 'An invoice cannot be generated before both parties have completed signatures and marked the agreement executed.', enforced: true },
    { id: 2, title: 'Proposal Acceptance Separation', desc: 'Proposal acceptance is explicitly segregated from mutual service agreement execution.', enforced: true },
    { id: 3, title: 'Dual Signature Enforcement', desc: 'An agreement remains partially signed after one signature and cannot be marked executed without two verified signatures.', enforced: true },
    { id: 4, title: 'Immutable Version Locking', desc: 'Once accepted, a proposal version is strictly locked against silent editing. Changes mandate a new version.', enforced: true },
    { id: 5, title: 'Proposal-Derived Agreement Terms', desc: 'Agreement terms are systematically derived from the accepted proposal deliverables and pricing.', enforced: true },
    { id: 6, title: 'Manual Freelancer Invoice Confirmation', desc: 'The freelancer must manually review milestones and click Generate Invoice after both signatures are sealed.', enforced: true },
    { id: 7, title: 'Strict Audit Logging', desc: 'Every state transition, acceptance, signature, invoice issuance, and payment is recorded with timestamp and IP.', enforced: true },
    { id: 8, title: 'Server-Side Financial Sums', desc: 'All subtotals, milestone discounts, GST calculations, and payment balances are computed and validated on the server.', enforced: true }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Settings</h1>
        <p className="text-xs text-stone-500 mt-0.5">Core engagement business rules and server-side workflow enforcement policies</p>
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

      <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Enforced Domain Operations
            </h2>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
            Active on Server
          </span>
        </div>

        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900">{r.title}</h3>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded font-semibold">
                    ENFORCED
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
