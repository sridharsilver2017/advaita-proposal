// src/pages/admin/ProjectDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  FileSpreadsheet,
  FileSignature,
  Receipt,
  Plus,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate, formatINR } from '../../lib/formatters';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const res = await apiRequest(`/api/projects/${projectId}`);
      if (res.success) {
        setProject(res.project);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await apiRequest(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        setProject({ ...project, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Status transition failed.');
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading project...</div>;
  }
  if (!project) {
    return <div className="p-8 text-center text-xs text-rose-500">Project not found.</div>;
  }

  const steps = [
    { key: 'lead', label: 'Lead' },
    { key: 'proposal_sent', label: 'Proposal Sent' },
    { key: 'agreement_pending', label: 'Agreement Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' }
  ];

  const currentStepIdx = steps.findIndex(s => s.key === project.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-xs text-stone-500">Client: {project.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/proposals/new?client_id=${project.client_id}&project_id=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Proposal
          </Link>
        </div>
      </div>

      {/* Workflow Progress Tracker */}
      <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Lifecycle Workflow Progression</h2>
        <div className="flex items-center justify-between relative overflow-x-auto py-2">
          {steps.map((step, idx) => {
            const isCompleted = currentStepIdx >= idx;
            const isCurrent = currentStepIdx === idx;
            return (
              <div key={step.key} className="flex flex-col items-center flex-1 min-w-[100px] text-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-stone-900 text-white ring-4 ring-stone-100'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                  }`}
                >
                  {isCompleted && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-[11px] mt-1.5 font-medium ${isCurrent ? 'text-stone-900 font-bold' : 'text-stone-500'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          <span className="text-stone-500">Update project state:</span>
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800"
          >
            <option value="lead">Lead</option>
            <option value="proposal_preparation">Proposal Preparation</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="agreement_pending">Agreement Pending</option>
            <option value="ready_to_start">Ready to Start</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Project Info & Relationships */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Proposals */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-stone-500" />
                Linked Proposals ({project.proposals?.length || 0})
              </h3>
              <Link
                to={`/proposals/new?client_id=${project.client_id}&project_id=${project.id}`}
                className="text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                + New Proposal
              </Link>
            </div>
            {project.proposals?.length === 0 ? (
              <p className="text-xs text-stone-400 py-2">No proposal created for this project yet.</p>
            ) : (
              project.proposals.map((pr: any) => (
                <div
                  key={pr.id}
                  onClick={() => navigate(`/proposals/${pr.id}`)}
                  className="p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-900">{pr.proposal_number}</span>
                    <p className="text-xs text-stone-600">{pr.title}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Value: {formatINR(pr.total)}</p>
                  </div>
                  <StatusBadge status={pr.status} />
                </div>
              ))
            )}
          </div>

          {/* Agreements */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSignature className="w-4 h-4 text-stone-500" />
                Linked Mutual Agreements ({project.agreements?.length || 0})
              </h3>
            </div>
            {project.agreements?.length === 0 ? (
              <p className="text-xs text-stone-400 py-2">Agreements are generated after proposal acceptance.</p>
            ) : (
              project.agreements.map((a: any) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/agreements/${a.id}`)}
                  className="p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-900">{a.agreement_number}</span>
                    <p className="text-[11px] text-stone-500 mt-0.5">Method: {a.signing_method}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
          </div>

          {/* Invoices */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-stone-500" />
                Linked Invoices ({project.invoices?.length || 0})
              </h3>
            </div>
            {project.invoices?.length === 0 ? (
              <p className="text-xs text-stone-400 py-2">Invoices can be generated after agreement is fully executed.</p>
            ) : (
              project.invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-900">{inv.invoice_number}</span>
                    <p className="text-xs text-stone-600">{formatINR(inv.total_payable)}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Project Details Sidebar */}
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3 text-xs">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
              Project Information
            </h3>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Service Category</span>
              <p className="font-medium text-stone-800">{project.service_category || 'General Design'}</p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Timeline</span>
              <p className="font-medium text-stone-800">
                {formatDate(project.start_date)} — {formatDate(project.expected_completion_date) || 'Open-ended'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold">Description</span>
              <p className="text-stone-600 mt-0.5 leading-relaxed">
                {project.description || 'No description provided.'}
              </p>
            </div>
            {project.internal_notes && (
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[10px] text-stone-400 uppercase font-semibold">Private Notes</span>
                <p className="text-stone-500 italic mt-0.5">{project.internal_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
