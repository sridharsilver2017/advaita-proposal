// src/components/layout/PortalLayout.tsx
import React from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { FileSpreadsheet, FileSignature, Receipt, Files, ShieldCheck, ExternalLink } from 'lucide-react';

export const PortalLayout: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const portalNav = [
    { name: 'Proposal', href: `/portal/${token}/proposal`, icon: FileSpreadsheet },
    { name: 'Agreement', href: `/portal/${token}/agreement`, icon: FileSignature },
    { name: 'Invoices', href: `/portal/${token}/invoices`, icon: Receipt },
    { name: 'Documents', href: `/portal/${token}/documents`, icon: Files }
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Brand Banner */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logos/advaita-logo.png"
              alt="Advaita Designs"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 tracking-tight text-sm">ADVAITA DESIGNS</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Portal
                </span>
              </div>
              <p className="text-[11px] text-stone-500">Client Engagement & Document Centre</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            {portalNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <div className="max-w-5xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Advaita Designs. All rights reserved. Documents are digitally sealed and legally binding.</p>
        </div>
      </footer>
    </div>
  );
};
