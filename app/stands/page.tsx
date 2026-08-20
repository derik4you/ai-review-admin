'use client';

import React, { useState, useEffect } from 'react';
import { 
  QrCode, Printer, CheckCircle2, Search, RefreshCw, 
  X, ExternalLink, Eye, Copy, Check, Plus, Download, Store
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface BusinessItem {
  id: string;
  name: string;
  slug: string;
}

interface QrStandItem {
  standNumber: number;
  status: string;
  businessId?: string | null;
  business?: BusinessItem | null;
  updatedAt?: string;
}

export default function AdminStandsPage() {
  const [stands, setStands] = useState<QrStandItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateCountInput, setGenerateCountInput] = useState<number>(10);

  const [inspectedStand, setInspectedStand] = useState<QrStandItem | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const fetchStandsData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stands');
      const data = await res.json();
      if (Array.isArray(data.stands)) setStands(data.stands);
      if (Array.isArray(data.businesses)) setBusinesses(data.businesses);
    } catch (e) {
      console.error('Failed to fetch stands inventory:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStandsData();
  }, []);

  const handleGenerateQrs = async (qtyToGenerate?: number) => {
    const qty = qtyToGenerate || generateCountInput;
    if (qty <= 0) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/stands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: qty }),
      });

      if (res.ok) {
        await fetchStandsData();
      }
    } catch (e) {
      console.error('Failed to generate QR stands:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stands', {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchStandsData();
      }
    } catch (e) {
      console.error('Failed to reset inventory:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkChange = (standNumber: number, targetBusinessId: string) => {
    const selectedBiz = businesses.find((b) => b.id === targetBusinessId);
    const isUnbind = !targetBusinessId || targetBusinessId === 'UNBIND';

    setStands((prevStands) =>
      prevStands.map((s) => {
        if (s.standNumber === standNumber) {
          return {
            ...s,
            businessId: isUnbind ? null : targetBusinessId,
            status: isUnbind ? 'UNASSIGNED' : 'ASSIGNED',
            business: isUnbind
              ? undefined
              : selectedBiz
              ? { id: selectedBiz.id, name: selectedBiz.name, slug: selectedBiz.slug }
              : s.business,
          };
        }
        return s;
      })
    );

    fetch('/api/admin/stands', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        standNumber,
        businessId: targetBusinessId,
      }),
    }).catch((err) => console.error('Failed to update stand link:', err));
  };

  const filteredStands = stands.filter((s) => {
    const numStr = String(s.standNumber).padStart(3, '0');
    const matchesSearch =
      numStr.includes(searchQuery) ||
      (s.business?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ASSIGNED' && (s.status === 'ASSIGNED' || s.businessId)) ||
      (filterStatus === 'UNASSIGNED' && s.status !== 'ASSIGNED' && !s.businessId);

    return matchesSearch && matchesStatus;
  });

  const assignedCount = stands.filter((s) => s.status === 'ASSIGNED' || s.businessId).length;
  const unassignedCount = stands.length - assignedCount;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const handleCopyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {}
  };

  const downloadQrPng = (standNumber: number) => {
    const svgElement = document.getElementById(`qr-svg-${standNumber}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 20, 20, 360, 360);
      }
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Stand_${String(standNumber).padStart(3, '0')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="space-y-6">
      {/* Header Controls Card */}
      <div className="google-app-card p-6 border border-[#dadce0] space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dadce0] pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#202124] flex items-center space-x-2">
              <QrCode className="w-6 h-6 text-[#9b51e0]" />
              <span>QR Stand Inventory Manager</span>
            </h2>
            <p className="text-xs text-[#5f6368] mt-1">
              Currently managing <strong className="text-[#9b51e0]">{stands.length} active QR stands</strong> in inventory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleGenerateQrs(10)}
              disabled={isGenerating}
              className="py-2.5 px-4 rounded-full btn-google-primary text-xs font-bold flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Generate 10 QR Codes</span>
            </button>

            <button
              type="button"
              onClick={handleResetInventory}
              className="py-2.5 px-3.5 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] font-bold text-xs flex items-center space-x-1.5 border border-[#dadce0] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset 10 Clean Stands</span>
            </button>

            {stands.length > 0 && (
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="py-2.5 px-3.5 rounded-full bg-[#f8f9fa] hover:bg-[#f1f3f4] text-[#202124] text-xs font-bold flex items-center space-x-1.5 border border-[#dadce0] transition-colors"
              >
                <Printer className="w-4 h-4 text-[#1a73e8]" />
                <span>Bulk Print Cards</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        {stands.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Stand # or Shop name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full google-search-bar pl-9 pr-3 py-2 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold border ${
                  filterStatus === 'ALL'
                    ? 'bg-[#f3e8ff] border-[#e9d5ff] text-[#9b51e0]'
                    : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368]'
                }`}
              >
                All ({stands.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('ASSIGNED')}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold border ${
                  filterStatus === 'ASSIGNED'
                    ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                    : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368]'
                }`}
              >
                🟢 Assigned ({assignedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('UNASSIGNED')}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold border ${
                  filterStatus === 'UNASSIGNED'
                    ? 'bg-[#f1f3f4] border-[#dadce0] text-[#202124]'
                    : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368]'
                }`}
              >
                ⚪ Unassigned ({unassignedCount})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stand Inventory Grid */}
      {isLoading ? (
        <div className="p-12 text-center space-y-2">
          <RefreshCw className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" />
          <p className="text-xs text-[#5f6368]">Loading stand inventory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredStands.map((s) => {
            const isAssigned = Boolean(s.businessId || s.business);
            const standFormatted = `#${String(s.standNumber).padStart(3, '0')}`;
            const standUrl = `${currentOrigin}/q/${s.standNumber}`;

            return (
              <div
                key={s.standNumber}
                className="google-app-card p-4 border border-[#dadce0] flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-[#9b51e0]">
                    {standFormatted}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isAssigned
                        ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                        : 'bg-[#f1f3f4] border-[#dadce0] text-[#5f6368]'
                    }`}
                  >
                    {isAssigned ? '🟢 Assigned' : '⚪ Unassigned'}
                  </span>
                </div>

                <div
                  onClick={() => setInspectedStand(s)}
                  className="p-3 bg-white rounded-xl border border-[#dadce0] flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow group"
                >
                  <QRCodeSVG
                    id={`qr-svg-${s.standNumber}`}
                    value={standUrl}
                    size={110}
                    level="M"
                  />
                  <span className="mt-1 text-[9px] font-bold text-[#5f6368] flex items-center space-x-1 group-hover:text-[#1a73e8]">
                    <Eye className="w-2.5 h-2.5" />
                    <span>Inspect / Download</span>
                  </span>
                </div>

                <div className="min-h-[38px] flex flex-col justify-center">
                  {isAssigned ? (
                    <div>
                      <p className="text-xs font-bold text-[#202124] truncate">
                        {s.business?.name || 'Assigned Store'}
                      </p>
                      <p className="text-[10px] text-[#5f6368] font-mono">
                        {s.business?.slug ? `/biz/${s.business.slug}` : 'Linked'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#5f6368] italic">No shop assigned yet</p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#dadce0] space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#5f6368] block mb-1">
                      Assign to Store:
                    </label>
                    <select
                      value={s.businessId || 'UNBIND'}
                      onChange={(e) => handleLinkChange(s.standNumber, e.target.value)}
                      className="w-full bg-[#f8f9fa] border border-[#dadce0] text-xs text-[#202124] font-medium rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#1a73e8]"
                    >
                      <option value="UNBIND">⚪ Unassigned (Unbind)</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          🟢 {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectedStand(s)}
                    className="w-full py-1.5 px-2 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors border border-[#dadce0]"
                  >
                    <Eye className="w-3 h-3 text-[#1a73e8]" />
                    <span>Inspect Stand Code</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INSPECTOR MODAL */}
      {inspectedStand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-[#dadce0] space-y-5 shadow-xl relative text-center">
            <button
              onClick={() => setInspectedStand(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-[#f3e8ff] border border-[#e9d5ff] text-[#9b51e0] text-xs font-mono font-bold inline-block">
                PHYSICAL STAND #{String(inspectedStand.standNumber).padStart(3, '0')}
              </span>
              <h3 className="text-xl font-black text-[#202124] pt-1">
                {inspectedStand.business?.name || 'Unassigned Stand'}
              </h3>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-[#dadce0] inline-block mx-auto shadow-inner">
              <QRCodeSVG
                id={`qr-modal-svg-${inspectedStand.standNumber}`}
                value={`${currentOrigin}/q/${inspectedStand.standNumber}`}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#dadce0] font-mono text-xs text-[#1a73e8] truncate">
              {currentOrigin}/q/{inspectedStand.standNumber}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handleCopyLink(`${currentOrigin}/q/${inspectedStand.standNumber}`)}
                className="py-2 px-3.5 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] text-xs font-bold flex items-center space-x-1.5 border border-[#dadce0]"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#137333]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => downloadQrPng(inspectedStand.standNumber)}
                className="py-2 px-3.5 rounded-full bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] text-xs font-bold flex items-center space-x-1.5 border border-[#d2e3fc]"
              >
                <Download className="w-4 h-4" />
                <span>Save Image (PNG)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
