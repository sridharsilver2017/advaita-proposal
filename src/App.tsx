// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { PortalLayout } from './components/layout/PortalLayout';

// Admin Pages
import { LoginPage } from './pages/admin/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ClientsPage } from './pages/admin/ClientsPage';
import { ClientNewPage } from './pages/admin/ClientNewPage';
import { ClientDetailPage } from './pages/admin/ClientDetailPage';
import { ProjectsPage } from './pages/admin/ProjectsPage';
import { ProjectDetailPage } from './pages/admin/ProjectDetailPage';
import { ProposalsPage } from './pages/admin/ProposalsPage';
import { ProposalNewPage } from './pages/admin/ProposalNewPage';
import { ProposalDetailPage } from './pages/admin/ProposalDetailPage';
import { AgreementsPage } from './pages/admin/AgreementsPage';
import { AgreementDetailPage } from './pages/admin/AgreementDetailPage';
import { InvoicesPage } from './pages/admin/InvoicesPage';
import { InvoiceDetailPage } from './pages/admin/InvoiceDetailPage';
import { PaymentsPage } from './pages/admin/PaymentsPage';
import { DocumentsPage } from './pages/admin/DocumentsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsBusinessPage } from './pages/admin/SettingsBusinessPage';
import { SettingsTemplatesPage } from './pages/admin/SettingsTemplatesPage';
import { SettingsWorkflowPage } from './pages/admin/SettingsWorkflowPage';
import { SettingsSecurityPage } from './pages/admin/SettingsSecurityPage';

// Portal Pages
import { PortalProposalPage } from './pages/portal/PortalProposalPage';
import { PortalAgreementPage } from './pages/portal/PortalAgreementPage';
import { PortalSignPage } from './pages/portal/PortalSignPage';
import { PortalInvoicesPage } from './pages/portal/PortalInvoicesPage';
import { PortalDocumentsPage } from './pages/portal/PortalDocumentsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-xs text-stone-400">
        Authenticating session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Client Portal (Protected strictly by token) */}
          <Route path="/portal/:token" element={<PortalLayout />}>
            <Route index element={<Navigate to="proposal" replace />} />
            <Route path="proposal" element={<PortalProposalPage />} />
            <Route path="agreement" element={<PortalAgreementPage />} />
            <Route path="sign" element={<PortalSignPage />} />
            <Route path="invoices" element={<PortalInvoicesPage />} />
            <Route path="documents" element={<PortalDocumentsPage />} />
          </Route>

          {/* Freelancer Admin Workspace (Protected) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Clients */}
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/new" element={<ClientNewPage />} />
            <Route path="clients/:clientId" element={<ClientDetailPage />} />

            {/* Projects */}
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />

            {/* Proposals */}
            <Route path="proposals" element={<ProposalsPage />} />
            <Route path="proposals/new" element={<ProposalNewPage />} />
            <Route path="proposals/:proposalId" element={<ProposalDetailPage />} />

            {/* Agreements */}
            <Route path="agreements" element={<AgreementsPage />} />
            <Route path="agreements/:agreementId" element={<AgreementDetailPage />} />

            {/* Invoices */}
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />

            {/* Payments */}
            <Route path="payments" element={<PaymentsPage />} />

            {/* Documents */}
            <Route path="documents" element={<DocumentsPage />} />

            {/* Reports */}
            <Route path="reports" element={<ReportsPage />} />

            {/* Settings */}
            <Route path="settings" element={<Navigate to="/settings/business" replace />} />
            <Route path="settings/business" element={<SettingsBusinessPage />} />
            <Route path="settings/templates" element={<SettingsTemplatesPage />} />
            <Route path="settings/workflow" element={<SettingsWorkflowPage />} />
            <Route path="settings/security" element={<SettingsSecurityPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
