'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, RefreshCw, Sliders, Shield, AlertTriangle,
  CheckCircle2, Check, X, Plus, Trash2, Edit3, Copy,
  History, Settings, ToggleLeft, ToggleRight, Layers,
  Terminal, Globe, BookOpen, Ban, ArrowRight, Zap, Info
} from 'lucide-react';
import type {
  AiSettingsRecord,
  AiPromptVersionRecord,
  ClicheItem,
} from '@/lib/adminDb';
import type { AuditLogEntry } from '@/lib/adminAuth';

export default function AiControlClient() {
  const [activeTab, setActiveTab] = useState<
    'general' | 'rules' | 'cliches' | 'versions' | 'model' | 'activity'
  >('general');

  const [settings, setSettings] = useState<AiSettingsRecord | null>(null);
  const [activePrompt, setActivePrompt] = useState<AiPromptVersionRecord | null>(null);
  const [promptVersions, setPromptVersions] = useState<AiPromptVersionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionForm, setVersionForm] = useState({
    version: '',
    name: '',
    description: '',
    globalRules: '',
  });

  const [newClichePhrase, setNewClichePhrase] = useState('');
  const [newRuleText, setNewRuleText] = useState('');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAiData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/ai-control');
      if (res.ok) {
        const d = await res.json();
        setSettings(d.settings);
        setActivePrompt(d.activePrompt);
        setPromptVersions(d.promptVersions || []);
        setAuditLogs(d.auditLogs || []);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to load AI control settings');
      }
    } catch {
      setError('Network error while loading AI control settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiData();
  }, []);

  // ── Save General Settings ──────────────────────────────────────────────────
  const handleSaveSettings = async (partialUpdates: Partial<AiSettingsRecord>) => {
    setActionLoading('settings');
    try {
      const res = await fetch('/api/admin/ai-control', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialUpdates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Settings saved.');
        setSettings(data.settings);
      } else {
        showNotification('error', data.error || 'Failed to update settings');
      }
    } catch {
      showNotification('error', 'Network error updating settings');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Cliché Blacklist Actions ───────────────────────────────────────────────
  const handleAddCliche = async () => {
    if (!newClichePhrase.trim() || !settings) return;
    const cleanPhrase = newClichePhrase.trim();
    const updatedCliches: ClicheItem[] = [
      ...(settings.clicheBlacklist || []),
      { id: `cliche-${Date.now()}`, phrase: cleanPhrase, active: true },
    ];
    setNewClichePhrase('');
    await handleSaveSettings({ clicheBlacklist: updatedCliches });
  };

  const handleToggleCliche = async (id: string) => {
    if (!settings) return;
    const updated = (settings.clicheBlacklist || []).map((c) =>
      c.id === id ? { ...c, active: !c.active } : c
    );
    await handleSaveSettings({ clicheBlacklist: updated });
  };

  const handleDeleteCliche = async (id: string) => {
    if (!settings) return;
    const updated = (settings.clicheBlacklist || []).filter((c) => c.id !== id);
    await handleSaveSettings({ clicheBlacklist: updated });
  };

  // ── Global Rules Actions ───────────────────────────────────────────────────
  const handleAddRule = async () => {
    if (!newRuleText.trim() || !settings) return;
    const clean = newRuleText.trim();
    const updatedRules = [...(settings.globalRules || []), clean];
    setNewRuleText('');
    await handleSaveSettings({ globalRules: updatedRules });
  };

  const handleDeleteRule = async (index: number) => {
    if (!settings) return;
    const updatedRules = (settings.globalRules || []).filter((_, i) => i !== index);
    await handleSaveSettings({ globalRules: updatedRules });
  };

  // ── Prompt Version Actions ─────────────────────────────────────────────────
  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('version-create');
    try {
      const payload = {
        version: versionForm.version.trim(),
        name: versionForm.name.trim(),
        description: versionForm.description.trim(),
        globalRules: versionForm.globalRules
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean),
      };

      const res = await fetch('/api/admin/ai-control/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Prompt version created as draft.');
        setIsVersionModalOpen(false);
        fetchAiData();
      } else {
        showNotification('error', data.error || 'Failed to create prompt version');
      }
    } catch {
      showNotification('error', 'Network error creating prompt version');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicateVersion = (v: AiPromptVersionRecord) => {
    const nextVer = `${v.version}-copy`;
    setVersionForm({
      version: nextVer,
      name: `${v.name} (Copy)`,
      description: v.description || '',
      globalRules: (v.globalRules || []).join('\n'),
    });
    setIsVersionModalOpen(true);
  };

  const handleActivateVersion = async (versionId: string) => {
    setActionLoading(`activate-${versionId}`);
    try {
      const res = await fetch(`/api/admin/ai-control/versions/${versionId}/activate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Prompt version activated.');
        fetchAiData();
      } else {
        showNotification('error', data.error || 'Failed to activate prompt version');
      }
    } catch {
      showNotification('error', 'Network error activating prompt version');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl flex items-center space-x-2 transition-all ${
            toast.type === 'success'
              ? 'bg-[#1a3a28] text-[#3fb950] border-[#3fb950]/40'
              : 'bg-[#2d1b1e] text-[#f85149] border-[#f85149]/40'
          }`}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[#21262d] pb-5">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#58a6ff]" />
            <h1 className="text-xl font-black text-[#e6edf3]">AI Control Center & Prompt Engine</h1>
          </div>
          <p className="text-xs text-[#8b949e]">
            Centrally manage review generation rules, anti-cliché filters, and prompt versions without code changes
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activePrompt && (
            <div className="px-3 py-1.5 rounded-xl bg-[#161b22] border border-[#30363d] text-xs flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
              <span className="text-[#8b949e]">Active Engine:</span>
              <span className="font-mono font-bold text-[#58a6ff]">{activePrompt.version}</span>
            </div>
          )}
          <button
            onClick={fetchAiData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-[#2d1b1e] border border-[#f85149]/30 text-[#f85149] text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 bg-[#161b22] border border-[#30363d] p-1 rounded-xl overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'general' ? 'bg-[#1a73e8] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>General Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'rules' ? 'bg-[#1a73e8] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Review Rules ({settings?.globalRules?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('cliches')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'cliches' ? 'bg-[#1a73e8] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Cliché Blacklist ({settings?.clicheBlacklist?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'versions' ? 'bg-[#1a73e8] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Prompt Versions ({promptVersions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('model')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'model' ? 'bg-[#1a73e8] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Model Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'activity' ? 'bg-[#1a73e8] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log</span>
        </button>
      </div>

      {loading && !settings ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#58a6ff] animate-spin mx-auto" />
          <div className="text-xs text-[#8b949e]">Loading AI settings from Firestore...</div>
        </div>
      ) : settings ? (
        <>
          {/* ── TAB 1: GENERAL SETTINGS ────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Master AI Feature Toggles */}
              <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#e6edf3] flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-[#58a6ff]" />
                  <span>Master AI Feature Switches (Super Admin)</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#e6edf3]">AI Review Engine</div>
                      <div className="text-[11px] text-[#8b949e]">Master enable/disable switch</div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ aiEnabled: !settings.aiEnabled })}
                      className="p-1 text-[#58a6ff]"
                    >
                      {settings.aiEnabled ? <ToggleRight className="w-7 h-7 text-[#3fb950]" /> : <ToggleLeft className="w-7 h-7 text-[#8b949e]" />}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#e6edf3]">Review Drafts Generation</div>
                      <div className="text-[11px] text-[#8b949e]">Customer flow review drafts</div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ reviewGenerationEnabled: !settings.reviewGenerationEnabled })}
                      className="p-1 text-[#58a6ff]"
                    >
                      {settings.reviewGenerationEnabled ? <ToggleRight className="w-7 h-7 text-[#3fb950]" /> : <ToggleLeft className="w-7 h-7 text-[#8b949e]" />}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#e6edf3]">Dynamic Review Tags</div>
                      <div className="text-[11px] text-[#8b949e]">Category-specific smart tags</div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ dynamicTagsEnabled: !settings.dynamicTagsEnabled })}
                      className="p-1 text-[#58a6ff]"
                    >
                      {settings.dynamicTagsEnabled ? <ToggleRight className="w-7 h-7 text-[#3fb950]" /> : <ToggleLeft className="w-7 h-7 text-[#8b949e]" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Language Support Switches */}
              <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#e6edf3] flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-[#58a6ff]" />
                  <span>Language Support Switches</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#e6edf3]">English</div>
                      <div className="text-[11px] text-[#8b949e]">Natural customer reviews</div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ englishEnabled: !settings.englishEnabled })}
                      className="p-1 text-[#58a6ff]"
                    >
                      {settings.englishEnabled ? <ToggleRight className="w-7 h-7 text-[#3fb950]" /> : <ToggleLeft className="w-7 h-7 text-[#8b949e]" />}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#e6edf3]">Hindi (हिंदी)</div>
                      <div className="text-[11px] text-[#8b949e]">Conversational Devanagari</div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ hindiEnabled: !settings.hindiEnabled })}
                      className="p-1 text-[#58a6ff]"
                    >
                      {settings.hindiEnabled ? <ToggleRight className="w-7 h-7 text-[#3fb950]" /> : <ToggleLeft className="w-7 h-7 text-[#8b949e]" />}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#e6edf3]">Marathi (मराठी)</div>
                      <div className="text-[11px] text-[#8b949e]">Local natural dialect</div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ marathiEnabled: !settings.marathiEnabled })}
                      className="p-1 text-[#58a6ff]"
                    >
                      {settings.marathiEnabled ? <ToggleRight className="w-7 h-7 text-[#3fb950]" /> : <ToggleLeft className="w-7 h-7 text-[#8b949e]" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Generation Controls & Length */}
              <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#e6edf3]">Review Length & Style Parameters</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[#8b949e] font-semibold">Default Review Length</label>
                    <select
                      value={settings.defaultReviewLength}
                      onChange={(e: any) => handleSaveSettings({ defaultReviewLength: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-[#e6edf3] outline-none"
                    >
                      <option value="short">Short (10-20 words)</option>
                      <option value="medium">Medium (20-35 words)</option>
                      <option value="detailed">Detailed (35-70 words)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#8b949e] font-semibold">Location Mention Rate: {settings.locationMentionPercentage}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={settings.locationMentionPercentage}
                      onChange={(e) => handleSaveSettings({ locationMentionPercentage: Number(e.target.value) })}
                      className="w-full mt-2 accent-[#1a73e8]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#8b949e] font-semibold">Min Words ({settings.minWords})</label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={settings.minWords}
                      onChange={(e) => handleSaveSettings({ minWords: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-[#30363d] bg-[#0d1117] text-[#e6edf3] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#8b949e] font-semibold">Max Words ({settings.maxWords})</label>
                    <input
                      type="number"
                      min="20"
                      max="100"
                      value={settings.maxWords}
                      onChange={(e) => handleSaveSettings({ maxWords: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-[#30363d] bg-[#0d1117] text-[#e6edf3] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: REVIEW RULES ────────────────────────────────────────── */}
          {activeTab === 'rules' && (
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#e6edf3]">Global Review-Writing Rules</h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  These instructions are passed directly to the AI prompt engine across all business reviews
                </p>
              </div>

              {/* Add New Rule */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Always write in first-person customer voice..."
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                  className="flex-1 p-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-xs text-[#e6edf3] outline-none focus:border-[#58a6ff]"
                />
                <button
                  onClick={handleAddRule}
                  disabled={!newRuleText.trim() || actionLoading === 'settings'}
                  className="px-4 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {(settings.globalRules || []).map((rule, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between text-xs group">
                    <div className="flex items-start space-x-3">
                      <span className="font-mono text-[#58a6ff] font-bold">{idx + 1}.</span>
                      <span className="text-[#e6edf3]">{rule}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(idx)}
                      className="p-1 text-[#8b949e] hover:text-[#f85149] transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: CLICHÉ BLACKLIST ────────────────────────────────────── */}
          {activeTab === 'cliches' && (
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#e6edf3]">Anti-Cliché Banned Phrases Blacklist</h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Phrases strictly prohibited from appearing in generated customer reviews
                </p>
              </div>

              {/* Add Phrase */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Honestly, one of the best..."
                  value={newClichePhrase}
                  onChange={(e) => setNewClichePhrase(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCliche()}
                  className="flex-1 p-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-xs text-[#e6edf3] outline-none focus:border-[#58a6ff]"
                />
                <button
                  onClick={handleAddCliche}
                  disabled={!newClichePhrase.trim() || actionLoading === 'settings'}
                  className="px-4 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phrase</span>
                </button>
              </div>

              {/* Blacklist Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {(settings.clicheBlacklist || []).map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      c.active
                        ? 'bg-[#0d1117] border-[#21262d] text-[#e6edf3]'
                        : 'bg-[#161b22]/40 border-[#21262d]/40 text-[#8b949e] line-through'
                    }`}
                  >
                    <span className="truncate mr-2 font-medium" title={c.phrase}>
                      {c.phrase}
                    </span>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggleCliche(c.id)}
                        className={`p-1 rounded text-xs ${c.active ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}
                        title={c.active ? 'Disable phrase' : 'Enable phrase'}
                      >
                        {c.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCliche(c.id)}
                        className="p-1 rounded text-[#8b949e] hover:text-[#f85149]"
                        title="Delete phrase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: PROMPT VERSIONS ─────────────────────────────────────── */}
          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#e6edf3]">Prompt Version History & Rollbacks</h2>
                  <p className="text-xs text-[#8b949e]">Safe version control: never overwrite in-place; duplicate or activate with one click</p>
                </div>
                <button
                  onClick={() => {
                    setVersionForm({
                      version: `v1.${promptVersions.length}.0`,
                      name: 'Natural Review Engine Upgrade',
                      description: 'Refined customer review instructions.',
                      globalRules: (settings.globalRules || []).join('\n'),
                    });
                    setIsVersionModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold shadow transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Draft Version</span>
                </button>
              </div>

              <div className="space-y-3">
                {promptVersions.map((v) => {
                  const isActive = v.active;
                  const isBusy = actionLoading === `activate-${v.id}`;
                  return (
                    <div
                      key={v.id}
                      className={`p-5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-[#161b22] border-[#3fb950]/50 shadow-lg'
                          : 'bg-[#1c2128] border-[#30363d]'
                      }`}
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-black text-[#58a6ff] bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
                              {v.version}
                            </span>
                            <span className="font-bold text-[#e6edf3] text-sm">{v.name}</span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1a3a28] text-[#3fb950] border border-[#3fb950]/30 flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                <span>ACTIVE ENGINE</span>
                              </span>
                            )}
                          </div>
                          {v.description && (
                            <p className="text-xs text-[#8b949e]">{v.description}</p>
                          )}
                          <div className="text-[10px] text-[#484f58]">
                            Created by {v.createdBy} on {new Date(v.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDuplicateVersion(v)}
                            className="p-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] text-xs font-semibold border border-[#30363d] flex items-center space-x-1"
                            title="Duplicate as new draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>

                          {!isActive && (
                            <button
                              onClick={() => handleActivateVersion(v.id)}
                              disabled={isBusy}
                              className="px-3.5 py-2 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isBusy ? 'Activating...' : 'Activate Version'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Rules preview */}
                      <div className="mt-4 pt-3 border-t border-[#21262d] text-xs space-y-1">
                        <div className="text-[10px] uppercase font-bold text-[#8b949e]">Engine Rules ({v.globalRules?.length || 0}):</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(v.globalRules || []).slice(0, 3).map((r, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#0d1117] text-[#8b949e] text-[11px]">
                              {r}
                            </span>
                          ))}
                          {(v.globalRules || []).length > 3 && (
                            <span className="text-[11px] text-[#58a6ff]">+{v.globalRules.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 5: MODEL SETTINGS ──────────────────────────────────────── */}
          {activeTab === 'model' && (
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[#e6edf3]">Google Gemini LLM Parameters</h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Runtime model parameters for streaming review generation
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1">
                  <div className="text-[#8b949e]">Model Identifier</div>
                  <div className="font-mono font-bold text-[#58a6ff]">{settings.modelName}</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1">
                  <div className="text-[#8b949e]">Generation Temperature</div>
                  <div className="font-bold text-[#e6edf3]">{settings.temperature} (Natural & Varied)</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1">
                  <div className="text-[#8b949e]">Max Output Tokens</div>
                  <div className="font-bold text-[#e6edf3]">{settings.maxOutputTokens} tokens</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#21262d] text-xs text-[#8b949e] flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#3fb950] flex-shrink-0" />
                <span>
                  <strong>Security Guard:</strong> Gemini API keys are securely loaded from server-side environment variables and are never transmitted to client browsers.
                </span>
              </div>
            </div>
          )}

          {/* ── TAB 6: ACTIVITY AUDIT LOG ──────────────────────────────────── */}
          {activeTab === 'activity' && (
            <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#e6edf3]">AI Control Activity History</h2>
              <div className="space-y-2 text-xs">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log: any, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#e6edf3] flex items-center space-x-2">
                          <span className="font-mono text-[#58a6ff]">{log.action}</span>
                          <span className="text-[10px] text-[#8b949e]">by {log.adminId}</span>
                        </div>
                        {log.reason && <div className="text-[11px] text-[#8b949e] mt-0.5">{log.reason}</div>}
                      </div>
                      <div className="text-[10px] text-[#484f58] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-[#8b949e]">No recent AI activity recorded.</div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* ── Create / Duplicate Version Modal ───────────────────────────────── */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4 text-[#e6edf3] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
              <h2 className="text-sm font-bold">Create New Prompt Version Draft</h2>
              <button onClick={() => setIsVersionModalOpen(false)} className="text-[#8b949e] hover:text-[#e6edf3]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVersion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#8b949e]">Version Identifier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v1.1.0"
                    value={versionForm.version}
                    onChange={(e) => setVersionForm({ ...versionForm, version: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-[#e6edf3] font-mono outline-none focus:border-[#58a6ff]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#8b949e]">Version Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enhanced Location Context Engine"
                    value={versionForm.name}
                    onChange={(e) => setVersionForm({ ...versionForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#8b949e]">Description</label>
                <input
                  type="text"
                  placeholder="Summary of changes in this prompt version..."
                  value={versionForm.description}
                  onChange={(e) => setVersionForm({ ...versionForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#8b949e]">Engine Rules (1 rule per line) *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Sound like a real customer..."
                  value={versionForm.globalRules}
                  onChange={(e) => setVersionForm({ ...versionForm, globalRules: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-[#e6edf3] outline-none focus:border-[#58a6ff] resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#21262d]">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8b949e] hover:bg-[#21262d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'version-create'}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:opacity-50"
                >
                  {actionLoading === 'version-create' ? 'Creating...' : 'Save Draft Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
