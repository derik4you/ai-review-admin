/**
 * lib/analyticsDb.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Server-Side Platform Analytics & Customer Funnel Aggregator.
 * Optimized with 60s Server-Side In-Memory Cache and Single-Pass Aggregators.
 */

import { db } from './firebase';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { getBusinessesFromFirebase, BusinessRecord } from './firebaseDb';
import { normalizeCategory, CATEGORY_REGISTRY } from './aiService';

export interface DateRangeBounds {
  label: string;
  startMs: number;
  endMs: number;
}

export function parseDateRange(rangeStr = '7d'): DateRangeBounds {
  const now = new Date();
  const endMs = now.getTime();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  switch (rangeStr.toLowerCase()) {
    case 'today':
      return { label: 'Today', startMs: startOfDay, endMs };
    case 'yesterday': {
      const yesterdayStart = startOfDay - 24 * 60 * 60 * 1000;
      return { label: 'Yesterday', startMs: yesterdayStart, endMs: startOfDay - 1 };
    }
    case '7d':
    case '7days':
      return { label: 'Last 7 Days', startMs: endMs - 7 * 24 * 60 * 60 * 1000, endMs };
    case '30d':
    case '30days':
      return { label: 'Last 30 Days', startMs: endMs - 30 * 24 * 60 * 60 * 1000, endMs };
    case '90d':
    case '90days':
      return { label: 'Last 90 Days', startMs: endMs - 90 * 24 * 60 * 60 * 1000, endMs };
    case 'all':
    case 'alltime':
    default:
      return { label: 'All Time', startMs: 0, endMs };
  }
}

export interface PlatformOverviewMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  newBusinesses: number;
  totalScans: number;
  nfcScans: number;
  qrScans: number;
  reviewStarts: number;
  reviewsGenerated: number;
  reviewsCopied: number;
  googleRedirects: number;
  aiFailures: number;
}

export interface CustomerFunnelMetrics {
  scans: number;
  reviewStarts: number;
  reviewsGenerated: number;
  reviewsCopied: number;
  googleClicks: number;
  scanToStartRate: number | null;
  startToGenerateRate: number | null;
  generateToCopyRate: number | null;
  copyToGoogleRate: number | null;
  overallConversionRate: number | null;
  // Aliases for full backward-compatibility
  scanToStartedPct?: number | null;
  startToGeneratedPct?: number | null;
  generatedToCopiedPct?: number | null;
  copiedToGooglePct?: number | null;
  overallConversionPct?: number | null;
}

export interface TrendDayBucket {
  dateKey: string;
  label: string;
  scans: number;
  reviewsGenerated: number;
  reviewsCopied: number;
  googleClicks: number;
}

export interface BusinessPerformanceItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  normalizedCategory: string;
  city: string | null;
  status: string;
  scans: number;
  reviewsGenerated: number;
  reviewsCopied: number;
  googleClicks: number;
  conversionRate: number | null;
  hasGoogleUrl: boolean;
  hasAiProfile: boolean;
  hasTags: boolean;
  customerFlowEnabled: boolean;
  createdAt: string;
}

export interface CategoryPerformanceItem {
  normalizedCategory: string;
  displayName: string;
  businessesCount: number;
  scans: number;
  reviewsGenerated: number;
  reviewsCopied: number;
  googleClicks: number;
  conversionRate: number | null;
}

export interface CustomerBehaviourMetrics {
  topTags: { tag: string; count: number }[];
  ratingDistribution: { rating: number; count: number; percentage: number }[];
  languageDistribution: { language: string; count: number; percentage: number }[];
  lengthDistribution: {
    short: number;
    medium: number;
    detailed: number;
  };
}

export interface AiPerformanceMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  fallbackGenerations: number;
  aiFailures: number;
  avgLatencyMs: number | null;
}

export interface AttentionRequiredBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  issueType: 'CONFIGURATION_PROBLEM' | 'LOW_USAGE';
  issues: string[];
}

export interface AggregatedAnalyticsResult {
  range: string;
  rangeLabel: string;
  overview: PlatformOverviewMetrics;
  funnel: CustomerFunnelMetrics;
  trends: TrendDayBucket[];
  businesses: BusinessPerformanceItem[];
  categories: CategoryPerformanceItem[];
  behaviour: CustomerBehaviourMetrics;
  aiPerformance: AiPerformanceMetrics;
  attentionRequired: AttentionRequiredBusiness[];
}

// ── In-Memory 60s Server Cache ───────────────────────────────────────────────
const analyticsCache = new Map<string, { data: AggregatedAnalyticsResult; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

export function invalidateAnalyticsCache(): void {
  analyticsCache.clear();
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function extractTimestampMs(raw: any): number {
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = new Date(raw).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (raw && typeof raw.toDate === 'function') {
    return raw.toDate().getTime();
  }
  if (raw && typeof raw.seconds === 'number') {
    return raw.seconds * 1000;
  }
  return 0;
}

// ─────────────────────────────────────────────
// Main Server-Side Aggregation Function
// ─────────────────────────────────────────────
export async function getPlatformAnalytics(dateRangeStr = '7d'): Promise<AggregatedAnalyticsResult> {
  const cacheKey = dateRangeStr.toLowerCase();
  const cached = analyticsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const bounds = parseDateRange(dateRangeStr);

  // 1. Parallel fetch collections
  const [businesses, eventsSnapshot, reviewsSnapshot] = await Promise.all([
    getBusinessesFromFirebase().catch(() => []),
    (bounds.startMs > 0
      ? getDocs(query(collection(db, 'analyticsEvents'), where('timestampMs', '>=', bounds.startMs), where('timestampMs', '<=', bounds.endMs)))
      : getDocs(query(collection(db, 'analyticsEvents'), limit(2000)))
    ).catch(() => ({ docs: [] as any[] })),
    getDocs(query(collection(db, 'reviewHistory'), limit(1000))).catch(() => ({ docs: [] as any[] })),
  ]);

  // 2. Filter Events within bounds
  const rawEvents: Array<{
    event: string;
    businessId: string;
    businessSlug?: string;
    source?: string;
    timestampMs: number;
    meta?: Record<string, any>;
  }> = [];

  for (const docSnap of eventsSnapshot.docs) {
    const d = docSnap.data();
    const ts = extractTimestampMs(d.timestamp || d.createdAt);
    if (ts >= bounds.startMs && ts <= bounds.endMs) {
      rawEvents.push({
        event: d.event || d.eventType || '',
        businessId: d.businessId || d.storeId || '',
        businessSlug: d.businessSlug || '',
        source: (d.source || d.method || 'NFC').toUpperCase(),
        timestampMs: ts,
        meta: d.meta || d.metadata || {},
      });
    }
  }

  // 3. Filter Review History within bounds
  const rawReviews: Array<{
    id: string;
    businessId: string;
    rating: number;
    language: string;
    selectedTags: string[];
    generatedReview?: string;
    status?: string;
    fallbackUsed?: boolean;
    durationMs?: number;
    timestampMs: number;
  }> = [];

  for (const docSnap of reviewsSnapshot.docs) {
    const d = docSnap.data();
    const ts = extractTimestampMs(d.timestamp || d.createdAt);
    if (ts >= bounds.startMs && ts <= bounds.endMs) {
      rawReviews.push({
        id: docSnap.id,
        businessId: d.businessId || d.storeId || '',
        rating: Number(d.rating) || 5,
        language: d.language || 'English',
        selectedTags: Array.isArray(d.selectedTags) ? d.selectedTags : [],
        generatedReview: d.generatedReview || d.reviewText || '',
        status: d.status || 'generated',
        fallbackUsed: d.fallbackUsed === true,
        durationMs: typeof d.durationMs === 'number' ? d.durationMs : undefined,
        timestampMs: ts,
      });
    }
  }

  // 4. Compute Overview Metrics
  let nfcScans = 0;
  let qrScans = 0;
  let reviewStarts = 0;
  let reviewsGenerated = 0;
  let reviewsCopied = 0;
  let googleRedirects = 0;
  let aiFailures = 0;

  for (const ev of rawEvents) {
    switch (ev.event) {
      case 'customer_scan':
      case 'scan':
        if (ev.source === 'QR') qrScans++;
        else nfcScans++;
        break;
      case 'review_started':
      case 'flow_start':
        reviewStarts++;
        break;
      case 'review_generated':
      case 'review_drafted':
        reviewsGenerated++;
        break;
      case 'review_copied':
      case 'copy_click':
        reviewsCopied++;
        break;
      case 'google_redirect_clicked':
      case 'google_click':
        googleRedirects++;
        break;
      case 'ai_generation_failed':
      case 'ai_error':
        aiFailures++;
        break;
    }
  }

  const totalScans = nfcScans + qrScans;
  const activeBusinesses = businesses.filter((b: any) => (b.status || 'ACTIVE') === 'ACTIVE').length;
  const newBusinesses = businesses.filter((b) => {
    const createdMs = extractTimestampMs(b.createdAt);
    return createdMs >= bounds.startMs && createdMs <= bounds.endMs;
  }).length;

  const overview: PlatformOverviewMetrics = {
    totalBusinesses: businesses.length,
    activeBusinesses,
    newBusinesses,
    totalScans,
    nfcScans,
    qrScans,
    reviewStarts,
    reviewsGenerated,
    reviewsCopied,
    googleRedirects,
    aiFailures,
  };

  // 5. Compute Funnel
  const funnel: CustomerFunnelMetrics = {
    scans: totalScans,
    reviewStarts,
    reviewsGenerated,
    reviewsCopied,
    googleClicks: googleRedirects,
    scanToStartRate: safeRatio(reviewStarts, totalScans),
    startToGenerateRate: safeRatio(reviewsGenerated, reviewStarts),
    generateToCopyRate: safeRatio(reviewsCopied, reviewsGenerated),
    copyToGoogleRate: safeRatio(googleRedirects, reviewsCopied),
    overallConversionRate: safeRatio(googleRedirects, totalScans),
  };

  // 6. Trends (Daily Buckets)
  const dayBucketsMap = new Map<string, { scans: number; reviewsGenerated: number; reviewsCopied: number; googleClicks: number }>();
  const isMultiDay = bounds.startMs > 0 && (bounds.endMs - bounds.startMs) > 36 * 60 * 60 * 1000;
  const bucketDays = isMultiDay ? Math.min(30, Math.ceil((bounds.endMs - bounds.startMs) / (24 * 60 * 60 * 1000))) : 7;

  for (let i = bucketDays - 1; i >= 0; i--) {
    const d = new Date(bounds.endMs - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dayBucketsMap.set(key, { scans: 0, reviewsGenerated: 0, reviewsCopied: 0, googleClicks: 0 });
  }

  for (const ev of rawEvents) {
    const key = new Date(ev.timestampMs).toISOString().split('T')[0];
    const b = dayBucketsMap.get(key);
    if (b) {
      if (ev.event === 'customer_scan' || ev.event === 'scan') b.scans++;
      else if (ev.event === 'review_generated' || ev.event === 'review_drafted') b.reviewsGenerated++;
      else if (ev.event === 'review_copied' || ev.event === 'copy_click') b.reviewsCopied++;
      else if (ev.event === 'google_redirect_clicked' || ev.event === 'google_click') b.googleClicks++;
    }
  }

  const trends: TrendDayBucket[] = Array.from(dayBucketsMap.entries()).map(([key, b]) => {
    const dt = new Date(key);
    const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dateKey: key, label, ...b };
  });

  // 7. Store Performance Map
  const storeMap = new Map<string, { scans: number; generated: number; copied: number; google: number }>();
  for (const ev of rawEvents) {
    const bid = ev.businessId || ev.businessSlug;
    if (!bid) continue;
    let s = storeMap.get(bid);
    if (!s) {
      s = { scans: 0, generated: 0, copied: 0, google: 0 };
      storeMap.set(bid, s);
    }
    if (ev.event === 'customer_scan' || ev.event === 'scan') s.scans++;
    else if (ev.event === 'review_generated' || ev.event === 'review_drafted') s.generated++;
    else if (ev.event === 'review_copied' || ev.event === 'copy_click') s.copied++;
    else if (ev.event === 'google_redirect_clicked' || ev.event === 'google_click') s.google++;
  }

  const businessPerformanceList: BusinessPerformanceItem[] = businesses.map((b) => {
    const countsByBid = storeMap.get(b.id) || storeMap.get(b.slug) || { scans: 0, generated: 0, copied: 0, google: 0 };
    const normalizedCat = normalizeCategory(b.category || '');
    const hasGoogle = !!(b.googleReviewUrl && b.googleReviewUrl.trim().startsWith('https://'));
    const hasAi = !!(b.aiProfile && b.aiProfile.businessPersonality);
    const tags = Array.isArray(b.reviewTags) ? b.reviewTags : [];
    const hasTags = tags.length > 0 || !!b.positiveTags;

    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      category: b.category || 'General Store',
      normalizedCategory: normalizedCat,
      city: b.city || b.location || null,
      status: (b as any).status || 'ACTIVE',
      scans: countsByBid.scans,
      reviewsGenerated: countsByBid.generated,
      reviewsCopied: countsByBid.copied,
      googleClicks: countsByBid.google,
      conversionRate: safeRatio(countsByBid.google, countsByBid.scans),
      hasGoogleUrl: hasGoogle,
      hasAiProfile: hasAi,
      hasTags: hasTags,
      customerFlowEnabled: (b as any).customerFlowEnabled !== false,
      createdAt: b.createdAt || new Date().toISOString(),
    };
  });

  // 8. Category Breakdown
  const catMap = new Map<string, { count: number; scans: number; gen: number; copied: number; google: number }>();
  for (const b of businessPerformanceList) {
    const c = b.normalizedCategory || 'CUSTOM';
    let entry = catMap.get(c);
    if (!entry) {
      entry = { count: 0, scans: 0, gen: 0, copied: 0, google: 0 };
      catMap.set(c, entry);
    }
    entry.count++;
    entry.scans += b.scans;
    entry.gen += b.reviewsGenerated;
    entry.copied += b.reviewsCopied;
    entry.google += b.googleClicks;
  }

  const categoryBreakdown: CategoryPerformanceItem[] = Array.from(catMap.entries()).map(([catKey, val]) => {
    const meta = (CATEGORY_REGISTRY as Record<string, any>)[catKey] || CATEGORY_REGISTRY.CUSTOM;
    return {
      normalizedCategory: catKey,
      displayName: meta.displayName,
      businessesCount: val.count,
      scans: val.scans,
      reviewsGenerated: val.gen,
      reviewsCopied: val.copied,
      googleClicks: val.google,
      conversionRate: safeRatio(val.google, val.scans),
    };
  });

  // 9. Customer Behaviour
  const tagCountsMap = new Map<string, number>();
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const langCountsMap = new Map<string, number>();
  const lengthCounts = { short: 0, medium: 0, detailed: 0 };

  for (const r of rawReviews) {
    const rNum = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    (ratingCounts as any)[rNum] = ((ratingCounts as any)[rNum] || 0) + 1;

    for (const t of r.selectedTags) {
      if (t) tagCountsMap.set(t, (tagCountsMap.get(t) || 0) + 1);
    }

    const lang = (r.language || 'English').trim();
    langCountsMap.set(lang, (langCountsMap.get(lang) || 0) + 1);

    const words = (r.generatedReview || '').trim().split(/\s+/).filter(Boolean).length;
    if (words < 15) lengthCounts.short++;
    else if (words <= 35) lengthCounts.medium++;
    else lengthCounts.detailed++;
  }

  const totalReviews = rawReviews.length || 1;
  const topTags = Array.from(tagCountsMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = (ratingCounts as any)[rating] || 0;
    return { rating, count, percentage: Math.round((count / totalReviews) * 100) };
  });

  const languageDistribution = Array.from(langCountsMap.entries())
    .map(([language, count]) => ({
      language,
      count,
      percentage: Math.round((count / totalReviews) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // 10. AI Engine Performance
  const latencies = rawReviews.map((r) => r.durationMs).filter((d): d is number => typeof d === 'number' && d > 0);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;
  const fallbacksCount = rawReviews.filter((r) => r.fallbackUsed).length;

  const aiPerformance: AiPerformanceMetrics = {
    totalGenerations: rawReviews.length,
    successfulGenerations: rawReviews.filter((r) => !r.fallbackUsed && r.status !== 'failed').length,
    fallbackGenerations: fallbacksCount,
    aiFailures,
    avgLatencyMs: avgLatency,
  };

  // 11. Stores Needing Attention
  const attentionRequired: AttentionRequiredBusiness[] = [];
  for (const b of businessPerformanceList) {
    const issues: string[] = [];
    let issueType: 'CONFIGURATION_PROBLEM' | 'LOW_USAGE' = 'CONFIGURATION_PROBLEM';

    if (!b.hasGoogleUrl) issues.push('Missing Google Review URL');
    if (!b.hasAiProfile) issues.push('Missing Business AI Profile');
    if (!b.hasTags) issues.push('No custom review tags configured');
    if (!b.customerFlowEnabled) issues.push('Customer review flow is DISABLED');

    if (issues.length === 0 && b.status === 'ACTIVE' && b.scans === 0) {
      issueType = 'LOW_USAGE';
      issues.push('Zero customer scans in selected period');
    }

    if (issues.length > 0) {
      attentionRequired.push({
        id: b.id,
        name: b.name,
        slug: b.slug,
        category: b.category,
        status: b.status,
        issueType,
        issues,
      });
    }
  }

  const finalResult: AggregatedAnalyticsResult = {
    range: dateRangeStr,
    rangeLabel: bounds.label,
    overview,
    funnel,
    trends,
    businesses: businessPerformanceList,
    categories: categoryBreakdown,
    behaviour: {
      topTags,
      ratingDistribution,
      languageDistribution,
      lengthDistribution: lengthCounts,
    },
    aiPerformance,
    attentionRequired,
  };

  // Cache result for 60 seconds
  analyticsCache.set(cacheKey, { data: finalResult, expiresAt: Date.now() + CACHE_TTL_MS });

  return finalResult;
}


