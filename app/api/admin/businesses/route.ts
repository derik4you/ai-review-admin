import { NextResponse } from 'next/server';
import { getBusinessesFromFirebase, saveBusinessToFirebase, getStandsFromFirebase } from '@/lib/firebaseDb';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET /api/admin/businesses — list all registered stores
export async function GET() {
  try {
    const businesses = await getBusinessesFromFirebase();
    const stands = await getStandsFromFirebase();

    const result = businesses.map((b) => {
      const assignedStandsCount = stands.filter(
        (s) => s.status === 'ASSIGNED' && (s.businessId === b.id || s.businessSlug === b.slug)
      ).length;

      return {
        id: b.id,
        loginId: b.loginId || '',
        name: b.name,
        slug: b.slug,
        category: b.category,
        googlePlaceId: b.googlePlaceId,
        googleReviewUrl: b.googleReviewUrl,
        keywords: b.keywords || '',
        createdAt: b.createdAt,
        assignedStandsCount,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch businesses' }, { status: 500 });
  }
}

// POST /api/admin/businesses — Admin creates a store (Option B dual-path)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, loginId, password, category, googlePlaceId, googleReviewUrl, keywords } = body;

    if (!name) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    const exactName = String(name).trim();
    const slug =
      exactName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
      '-' + Math.floor(100 + Math.random() * 900);

    // Hash password if provided; admin-created stores may have a loginId+password
    let passwordHash = '';
    if (loginId && password) {
      passwordHash = await bcrypt.hash(String(password), 10);
    }

    const newRecord = {
      id: `biz-${Date.now()}`,
      loginId: loginId ? String(loginId).trim().toLowerCase() : '',
      passwordHash,
      name: exactName,
      slug,
      category: category || 'General Store',
      googlePlaceId: googlePlaceId || '',
      googleReviewUrl: googleReviewUrl || (googlePlaceId ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}` : ''),
      keywords: keywords || '',
      positiveTags: JSON.stringify(
        keywords
          ? String(keywords).split(',').map((k: string) => k.trim()).filter(Boolean).slice(0, 6)
          : ['Great Service', 'High Quality', 'Friendly Staff']
      ),
      createdAt: new Date().toISOString(),
      ownerEmail: null,
    };

    await saveBusinessToFirebase(newRecord);

    return NextResponse.json({ success: true, business: { ...newRecord, passwordHash: undefined } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create business' }, { status: 500 });
  }
}
