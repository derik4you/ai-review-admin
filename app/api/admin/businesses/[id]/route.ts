/**
 * GET & PATCH /api/admin/businesses/[id]
 * ─────────────────────────────────────────────────────────────────────────────
 * High-performance Business Detail API with on-demand tab lazy loading.
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import { getBusinessById, saveBusinessToFirebase, getReviewHistory } from '@/lib/firebaseDb';
import { getAuditLogsForBusiness, getBusinessAnalyticsSummary } from '@/lib/adminDb';
import { normalizeCategory, CATEGORY_REGISTRY } from '@/lib/aiService';

export const dynamic = 'force-dynamic';

function validateGoogleUrl(url: string | null | undefined): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { isValid: true };
  }
  const clean = url.trim();
  if (clean.toLowerCase().startsWith('javascript:') || clean.toLowerCase().startsWith('data:') || clean.toLowerCase().startsWith('vbscript:')) {
    return { isValid: false, error: 'Unsafe URL protocol detected.' };
  }
  if (!clean.startsWith('https://')) {
    return { isValid: false, error: 'Google Review URL must use a secure HTTPS protocol (https://...).' };
  }
  return { isValid: true };
}

function computeHealth(business: any): { status: 'HEALTHY' | 'WARNING' | 'ERROR'; issues: string[] } {
  const issues: string[] = [];
  const status = business.status || 'ACTIVE';
  const customerFlow = business.customerFlowEnabled !== false;

  if (status === 'SUSPENDED') {
    issues.push(`Business is SUSPENDED (${business.suspendedReason || 'No reason specified'})`);
    return { status: 'ERROR', issues };
  }
  if (status === 'REJECTED') {
    issues.push(`Business registration REJECTED (${business.rejectedReason || 'No reason specified'})`);
    return { status: 'ERROR', issues };
  }
  if (!customerFlow) {
    issues.push('Customer NFC/QR review flow is DISABLED');
  }

  const hasAi = !!(business.aiProfile && business.aiProfile.businessPersonality);
  if (!hasAi) {
    issues.push('AI Profile is missing or incomplete');
  }

  const tags = business.reviewTags || [];
  if (!tags || tags.length === 0) {
    issues.push('No dynamic review tags configured');
  }

  if (!business.googleReviewUrl) {
    issues.push('Google Review URL is missing');
  }

  return {
    status: issues.length === 0 ? 'HEALTHY' : issues.some(i => i.includes('SUSPENDED') || i.includes('REJECTED')) ? 'ERROR' : 'WARNING',
    issues,
  };
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const params = await context.params;
    const businessId = params.id;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedTab = searchParams.get('tab') || 'overview';

    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Lazy load specific tab data on demand
    let reviews: any[] | null = null;
    let analytics: any = null;
    let auditLogs: any[] | null = null;

    if (requestedTab === 'reviews' || requestedTab === 'all') {
      reviews = await getReviewHistory(business.id, 25).catch(() => []);
    }
    if (requestedTab === 'analytics' || requestedTab === 'all') {
      analytics = await getBusinessAnalyticsSummary(business.id, business.slug).catch(() => ({
        totalScans: 0,
        reviewStarts: 0,
        reviewsGenerated: 0,
        reviewsCopied: 0,
        googleRedirects: 0,
        lastActivity: null,
      }));
    }
    if (requestedTab === 'audit' || requestedTab === 'all') {
      auditLogs = await getAuditLogsForBusiness(business.id, 25).catch(() => []);
    }

    const normalizedCat = normalizeCategory(business.category || '');
    const categoryMeta = CATEGORY_REGISTRY[normalizedCat] || CATEGORY_REGISTRY.CUSTOM;

    let googleUrlStatus: 'CONFIGURED' | 'MISSING' | 'INVALID' = 'CONFIGURED';
    if (!business.googleReviewUrl || !business.googleReviewUrl.trim()) {
      googleUrlStatus = 'MISSING';
    } else if (!business.googleReviewUrl.startsWith('https://')) {
      googleUrlStatus = 'INVALID';
    }

    const health = computeHealth(business);

    const safeReviews = reviews ? reviews.map((r: any) => ({
      id: r.id,
      generatedReview: r.generatedReview,
      rating: r.rating || 5,
      selectedTags: r.selectedTags || [],
      language: r.language || 'English',
      status: r.status || 'generated',
      createdAt: r.timestamp || r.createdAt || new Date().toISOString(),
    })) : undefined;

    const result = {
      id: business.id,
      name: business.name,
      slug: business.slug,
      category: business.category || 'General Store',
      normalizedCategory: normalizedCat,
      categoryDisplayName: categoryMeta.displayName,
      city: business.city || null,
      area: business.area || null,
      landmark: business.landmark || null,
      location: business.location || null,
      description: business.description || null,
      services: business.services || null,
      website: business.website || null,
      instagram: business.instagram || null,
      googleReviewUrl: business.googleReviewUrl || '',
      googleReviewUrlStatus: googleUrlStatus,
      googlePlaceId: business.googlePlaceId || '',
      status: (business as any).status || 'ACTIVE',
      customerFlowEnabled: (business as any).customerFlowEnabled !== false,
      adminNotes: (business as any).adminNotes || null,
      approvedAt: (business as any).approvedAt || null,
      approvedBy: (business as any).approvedBy || null,
      rejectedAt: (business as any).rejectedAt || null,
      rejectedReason: (business as any).rejectedReason || null,
      suspendedAt: (business as any).suspendedAt || null,
      suspendedBy: (business as any).suspendedBy || null,
      suspendedReason: (business as any).suspendedReason || null,
      archivedAt: (business as any).archivedAt || null,
      createdAt: business.createdAt,
      aiProfile: business.aiProfile || null,
      reviewTags: business.reviewTags || (business.positiveTags ? (() => { try { return JSON.parse(business.positiveTags); } catch { return []; } })() : []),
      owner: {
        loginId: business.loginId || '',
        accountStatus: (business as any).status || 'ACTIVE',
        registrationDate: business.createdAt,
      },
      health,
      ...(safeReviews !== undefined ? { reviews: safeReviews } : {}),
      ...(analytics ? { analytics } : {}),
      ...(auditLogs !== null ? { auditLogs } : {}),
    };

    return NextResponse.json({ success: true, business: result });
  } catch (error: any) {
    console.error('GET /api/admin/businesses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch business details' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const params = await context.params;
    const businessId = params.id;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const existing = await getBusinessById(businessId);
    if (!existing) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = [
      'name', 'category', 'description', 'services', 'city', 'area', 'landmark',
      'location', 'website', 'instagram', 'googleReviewUrl', 'googlePlaceId',
      'customerFlowEnabled', 'adminNotes', 'reviewTags', 'aiProfile',
    ];

    const updates: Record<string, any> = {};
    const beforeState: Record<string, any> = {};

    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
        beforeState[key] = (existing as any)[key];
      }
    }

    if ('googleReviewUrl' in updates) {
      const urlCheck = validateGoogleUrl(updates.googleReviewUrl);
      if (!urlCheck.isValid) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
      }
    }

    const updatedBusiness = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await saveBusinessToFirebase(updatedBusiness);

    writeAuditLog({
      adminId: session.adminId,
      action: 'business_updated',
      targetId: businessId,
      targetType: 'business',
      before: beforeState,
      after: updates,
    });

    return NextResponse.json({
      success: true,
      message: 'Business profile updated successfully.',
      business: updatedBusiness,
    });
  } catch (error: any) {
    console.error('PATCH /api/admin/businesses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update business profile' }, { status: 500 });
  }
}
