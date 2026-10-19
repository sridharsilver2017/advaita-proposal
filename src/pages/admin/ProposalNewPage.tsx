// src/pages/admin/ProposalNewPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Calculator } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatINR } from '../../lib/formatters';

export const ProposalNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('client_id') || '';
  const preselectedProjectId = searchParams.get('project_id') || '';

  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_id: preselectedClientId,
    project_id: preselectedProjectId,
    title: '',
    introduction: 'Advaita Designs is pleased to submit this proposal for your review. We look forward to creating an exceptional digital presence for your brand.',
    client_requirements: '',
    project_objectives: '',
    scope_of_work: '1. Complete Visual Brand Architecture\n2. Figma Tokenized Component Library\n3. Responsive High-Fidelity Prototypes (Desktop & Mobile)',
    deliverables: '• Comprehensive Design System in Figma\n• Brand Style Guide (Typography, Color Palette, Iconography)\n• Production-Ready Component Assets & Specs',
    exclusions: 'Backend cloud deployment hosting costs, 3rd party font licenses, stock photography beyond project budget.',
    timeline: '6 weeks estimated completion across 3 bi-weekly sprint milestones.',
    milestones: 'Milestone 1 (Week 1-2): Brand Exploration & Wireframes\nMilestone 2 (Week 3-4): Component Kit & Design Tokens\nMilestone 3 (Week 5-6): Full Application Prototypes & Final Handoff',
    revision_policy: 'Up to two (2) comprehensive rounds of feedback and revisions included per milestone.',
    client_responsibilities: 'Timely feedback within 3 business days of sprint reviews; provision of brand assets and copy.',
    freelancer_responsibilities: 'Weekly progress demos, pixel-perfect documentation, and complete source file handoff.',
    payment_schedule: '50% advance milestone retainer upon contract signing, 50% upon final deliverable approval.',
    additional_terms: 'All intellectual property is assigned to Client upon final settlement.',
    closing_statement: 'Thank you for considering Advaita Designs. We are excited about the prospect of partnering with your team.',
    validity_days: 14,
    discount: 0
  });

  const [items, setItems] = useState<Array<{ description: string; quantity: number; unit: string; rate: number; discount: number }>>([
    { description: 'Design Tokens & Component Architecture in Figma', quantity: 1, unit: 'package', rate: 75000, discount: 0 },
    { description: 'Responsive Mobile & Desktop User Experience Flows', quantity: 1, unit: 'package', rate: 50000, discount: 0 }
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (form.client_id) {
      setFilteredProjects(projects.filter(p => p.client_id === form.client_id));
    } else {
      setFilteredProjects(projects);
    }
  }, [form.client_id, projects]);

  async function loadInitialData() {
    try {
      const [cliRes, prjRes] = await Promise.all([
        apiRequest('/api/clients?status=active'),
        apiRequest('/api/projects')
      ]);
      if (cliRes.success) setClients(cliRes.clients);
      if (prjRes.success) {
        setProjects(prjRes.projects);
        if (form.client_id) {
          setFilteredProjects(prjRes.projects.filter((p: any) => p.client_id === form.client_id));
        } else {
          setFilteredProjects(prjRes.projects);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  function addItem() {
    setItems([
      ...items,
      { description: 'Design Milestone Deliverable', quantity: 1, unit: 'item', rate: 25000, discount: 0 }
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  }

  // Live calculations
  const subtotal = items.reduce((acc, i) => {
    const qty = Number(i.quantity) || 0;
    const rate = Number(i.rate) || 0;
    const disc = Number(i.discount) || 0;
    return acc + Math.max(0, (qty * rate) - disc);
  }, 0);

  const total = Math.max(0, subtotal - (Number(form.discount) || 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!form.client_id || !form.project_id || !form.title.trim()) {
      setError('Please select a client, linked project, and enter a proposal title.');
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest('/api/proposals', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          items
        })
      });

      if (res.success) {
        navigate(`/proposals/${res.proposal.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create proposal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/proposals"
          className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Author New Proposal</h1>
          <p className="text-xs text-stone-500">Create a comprehensive, numbered proposal with structured milestones</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Client & Project Selection */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Engagement Assignment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Client *
              </label>
              <select
                required
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value, project_id: '' })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white transition"
              >
                <option value="">Select a Client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Linked Project *
              </label>
              <select
                required
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white transition"
              >
                <option value="">Select a Project...</option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Proposal Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Omnichannel Experience & Tokenized Design Architecture"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>
          </div>
        </div>

        {/* Narrative & Objectives */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Scope & Deliverables
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Scope of Work *
              </label>
              <textarea
                rows={3}
                required
                value={form.scope_of_work}
                onChange={(e) => setForm({ ...form, scope_of_work: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Key Deliverables *
              </label>
              <textarea
                rows={3}
                required
                value={form.deliverables}
                onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Estimated Timeline *
                </label>
                <input
                  type="text"
                  required
                  value={form.timeline}
                  onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                  placeholder="e.g. 6 weeks across 3 sprint milestones"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Proposal Validity (Days)
                </label>
                <input
                  type="number"
                  value={form.validity_days}
                  onChange={(e) => setForm({ ...form, validity_days: Number(e.target.value) || 14 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Line Items */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Pricing Line Items
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs text-stone-800 hover:text-stone-950 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const lineTotal = Math.max(0, (Number(item.quantity) || 0) * (Number(item.rate) || 0) - (Number(item.discount) || 0));
              return (
                <div key={idx} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Item description / deliverable component"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 font-medium"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 font-medium">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-medium">Unit</span>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-medium">Rate (INR)</span>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 font-medium">Line Amount</span>
                      <p className="font-bold text-stone-900 pt-1">{formatINR(lineTotal)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals Summary */}
          <div className="pt-4 border-t border-stone-100 space-y-2 max-w-xs ml-auto text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-stone-900">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-stone-600">
              <span>Overall Discount:</span>
              <input
                type="number"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: Number(e.target.value) || 0 })}
                className="w-24 px-2 py-1 text-right bg-white border border-stone-200 rounded-lg text-xs"
              />
            </div>
            <div className="flex justify-between text-sm font-bold text-stone-950 pt-2 border-t border-stone-200">
              <span>Total Investment:</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Terms & Schedule */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Payment Schedule & Milestones
          </h2>
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Payment Schedule & Milestones *
            </label>
            <textarea
              rows={2}
              required
              value={form.payment_schedule}
              onChange={(e) => setForm({ ...form, payment_schedule: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/proposals"
            className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? 'Creating...' : 'Save & Prepare Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
};
