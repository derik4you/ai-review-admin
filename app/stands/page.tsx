'use client';

import React, { useState, useEffect } from 'react';
import { 
  QrCode, Printer, Search, RefreshCw, 
  X, Eye, Copy, Check, Plus, Download, ChevronLeft, ChevronRight,
  Sparkles, Layers
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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

// ─── SKELETON LOADER FOR STAND CARDS ─────────────────────────────────────────
function StandCardSkeleton() {
  return (
    <div className="google-app-card p-4 border border-[#dadce0] rounded-2xl flex flex-col justify-between space-y-3 animate-pulse bg-white">
      <div className="flex items-center justify-between">
        <div className="h-5 w-12 bg-[#f1f3f4] rounded-md" />
        <div className="h-4 w-16 bg-[#f1f3f4] rounded-full" />
      </div>

      <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#dadce0] flex flex-col items-center justify-center space-y-2">
        <div className="w-[110px] h-[110px] bg-[#e8eaed] rounded-lg" />
        <div className="h-2.5 w-20 bg-[#e8eaed] rounded" />
      </div>

      <div className="space-y-1.5 min-h-[38px] flex flex-col justify-center">
        <div className="h-3.5 w-28 bg-[#f1f3f4] rounded" />
        <div className="h-2.5 w-20 bg-[#f1f3f4] rounded" />
      </div>

      <div className="pt-2 border-t border-[#dadce0] space-y-2">
        <div className="h-8 w-full bg-[#f1f3f4] rounded-xl" />
        <div className="h-7 w-full bg-[#f1f3f4] rounded-full" />
      </div>
    </div>
  );
}

export default function AdminStandsPage() {
  const [stands, setStands] = useState<QrStandItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  // Pagination / 10-at-a-time chunking
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateCountInput, setGenerateCountInput] = useState<number>(10);

  const [inspectedStand, setInspectedStand] = useState<QrStandItem | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [updatingStandNum, setUpdatingStandNum] = useState<number | null>(null);

  const fetchStandsData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stands', {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      });
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

  const handleLinkChange = async (standNumber: number, targetBusinessId: string) => {
    const selectedBiz = businesses.find((b) => b.id === targetBusinessId);
    const isUnbind = !targetBusinessId || targetBusinessId === 'UNBIND';

    setUpdatingStandNum(standNumber);

    // Optimistic UI update
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

    try {
      await fetch('/api/admin/stands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standNumber,
          businessId: targetBusinessId,
        }),
      });
    } catch (err) {
      console.error('Failed to update stand link:', err);
    } finally {
      setUpdatingStandNum(null);
    }
  };

  // Filtered stands based on search and status
  const filteredStands = stands.filter((s) => {
    const numStr = String(s.standNumber).padStart(3, '0');
    const matchesSearch =
      numStr.includes(searchQuery) ||
      String(s.standNumber).includes(searchQuery) ||
      (s.business?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ASSIGNED' && (s.status === 'ASSIGNED' || s.businessId)) ||
      (filterStatus === 'UNASSIGNED' && s.status !== 'ASSIGNED' && !s.businessId);

    return matchesSearch && matchesStatus;
  });

  // Pagination calculation
  const totalItems = filteredStands.length;
  const effectivePageSize = pageSize === -1 ? totalItems : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalItems / effectivePageSize) : 1;
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  
  const startIndex = (safePage - 1) * effectivePageSize;
  const paginatedStands = pageSize === -1 ? filteredStands : filteredStands.slice(startIndex, startIndex + effectivePageSize);

  const assignedCount = stands.filter((s) => s.status === 'ASSIGNED' || s.businessId).length;
  const unassignedCount = stands.length - assignedCount;
  const [customOrigin, setCustomOrigin] = useState<string>('');

  const getResolvedCustomerOrigin = () => {
    if (customOrigin.trim()) return customOrigin.trim().replace(/\/$/, '');
    if (typeof window === 'undefined') return 'http://localhost:3000';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    const envUrl = process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, '');
    if (window.location.hostname.includes('-admin')) {
      return window.location.origin.replace('-admin', '');
    }
    return window.location.origin;
  };

  const currentOrigin = getResolvedCustomerOrigin();

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
              Currently managing <strong className="text-[#9b51e0]">{stands.length} total QR stands</strong> in inventory ({assignedCount} assigned, {unassignedCount} unassigned).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleGenerateQrs(10)}
              disabled={isGenerating}
              className="py-2.5 px-4 rounded-full btn-google-primary font-bold text-xs flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : '+ Generate 10 QR Codes'}</span>
            </button>

            <button
              type="button"
              onClick={fetchStandsData}
              disabled={isLoading}
              className="py-2.5 px-3.5 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] font-bold text-xs flex items-center space-x-1.5 border border-[#dadce0] transition-colors"
              title="Sync latest stands with Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync Inventory</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Stand # or Shop name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full google-search-bar pl-9 pr-3 py-2 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
                className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-colors ${
                  filterStatus === 'ALL'
                    ? 'bg-[#f3e8ff] border-[#e9d5ff] text-[#9b51e0]'
                    : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}
              >
                All ({stands.length})
              </button>
              <button
                type="button"
                onClick={() => { setFilterStatus('ASSIGNED'); setCurrentPage(1); }}
                className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-colors ${
                  filterStatus === 'ASSIGNED'
                    ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                    : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}
              >
                Assigned ({assignedCount})
              </button>
              <button
                type="button"
                onClick={() => { setFilterStatus('UNASSIGNED'); setCurrentPage(1); }}
                className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-colors ${
                  filterStatus === 'UNASSIGNED'
                    ? 'bg-[#f1f3f4] border-[#dadce0] text-[#202124]'
                    : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}
              >
                Unassigned ({unassignedCount})
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-[#5f6368]">
              <span className="font-semibold">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#dadce0] rounded-lg px-2 py-1 text-xs font-bold text-[#202124] focus:outline-none focus:border-[#1a73e8]"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={-1}>All ({stands.length})</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stand Inventory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, idx) => (
            <StandCardSkeleton key={idx} />
          ))}
        </div>
      ) : paginatedStands.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#dadce0] rounded-2xl space-y-2 shadow-xs">
          <QrCode className="w-10 h-10 text-[#9aa0a6] mx-auto" />
          <h3 className="text-sm font-bold text-[#202124]">No stands match your filter</h3>
          <p className="text-xs text-[#5f6368]">Try changing your search query or status filter.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedStands.map((s) => {
              const isAssigned = Boolean(s.businessId || s.business);
              const standFormatted = `#${String(s.standNumber).padStart(3, '0')}`;
              const standUrl = `${currentOrigin}/q/${s.standNumber}`;
              const isUpdating = updatingStandNum === s.standNumber;

              return (
                <div
                  key={s.standNumber}
                  className="google-app-card p-4 border border-[#dadce0] flex flex-col justify-between space-y-3 bg-white hover:shadow-md transition-shadow relative"
                >
                  {isUpdating && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-xs rounded-2xl flex items-center justify-center z-10">
                      <RefreshCw className="w-5 h-5 text-[#1a73e8] animate-spin" />
                    </div>
                  )}

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
                      {isAssigned ? 'Assigned' : 'Unassigned'}
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
                      level="H"
                      includeMargin={true}
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
                        <p className="text-[10px] text-[#5f6368] font-mono truncate">
                          {s.business?.slug ? `/biz/${s.business.slug}` : 'Linked'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#5f6368] italic">Ready for on-site install</p>
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
                        <option value="UNBIND">Unassigned (Unbind)</option>
                        {businesses.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
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

          {/* Pagination Controls */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border border-[#dadce0] rounded-2xl shadow-xs">
              <span className="text-xs text-[#5f6368] font-medium">
                Showing <strong className="text-[#202124]">{startIndex + 1}</strong> to{' '}
                <strong className="text-[#202124]">
                  {Math.min(startIndex + pageSize, totalItems)}
                </strong>{' '}
                of <strong className="text-[#202124]">{totalItems}</strong> QR stands
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="py-1.5 px-3 rounded-lg border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-bold text-[#202124] flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1 px-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first, last, and pages around current page
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - safePage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                            safePage === pageNum
                              ? 'bg-[#1a73e8] text-white shadow-xs'
                              : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === safePage - 2 ||
                      pageNum === safePage + 2
                    ) {
                      return (
                        <span key={pageNum} className="text-xs text-[#9aa0a6] px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="py-1.5 px-3 rounded-lg border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-xs font-bold text-[#202124] flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* INSPECTOR MODAL */}
      {inspectedStand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
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


