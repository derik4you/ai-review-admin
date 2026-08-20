import { NextResponse } from 'next/server';
import { getStandsFromFirebase, getBusinessesFromFirebase, updateStandInFirebase } from '@/lib/firebaseDb';
import { generateNewJsonStands } from '@/lib/jsonDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stands = await getStandsFromFirebase();
    const businesses = await getBusinessesFromFirebase();

    const formattedStands = stands.map((s) => ({
      standNumber: s.standNumber,
      status: s.status,
      businessId: s.businessId,
      business: (s.status === 'ASSIGNED' && s.businessId)
        ? businesses.find((b) => b.id === s.businessId || b.slug === s.businessSlug) || { id: s.businessId, name: s.businessName || 'Assigned Store', slug: s.businessSlug || '' }
        : null,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({
      stands: formattedStands,
      businesses: businesses.map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch stands' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = typeof body.count === 'number' ? body.count : 10;
    const updated = generateNewJsonStands(count);

    return NextResponse.json({ success: true, total: updated.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate stands' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { standNumber, businessId, businessName, businessSlug } = body;

    if (!standNumber) {
      return NextResponse.json({ error: 'Stand number is required' }, { status: 400 });
    }

    const isUnbind = !businessId || businessId === 'UNBIND' || businessId === 'null';
    const businesses = await getBusinessesFromFirebase();
    const targetBiz = isUnbind ? null : businesses.find((b) => b.id === businessId || b.slug === businessId);

    const finalBizId = isUnbind ? null : (targetBiz?.id || businessId);
    const finalBizName = isUnbind ? null : (targetBiz?.name || businessName || 'Assigned Store');
    const finalBizSlug = isUnbind ? null : (targetBiz?.slug || businessSlug || (typeof businessId === 'string' && !businessId.startsWith('biz-') && !businessId.startsWith('cmt') ? businessId : null));

    await updateStandInFirebase(
      Number(standNumber),
      finalBizId,
      finalBizName,
      finalBizSlug
    );

    const updatedStands = await getStandsFromFirebase();

    return NextResponse.json({ success: true, stands: updatedStands });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update stand' }, { status: 500 });
  }
}

// Stand Immutability Rule: Stands are permanent assets and CANNOT be deleted.
export async function DELETE() {
  return NextResponse.json(
    { error: 'Action Forbidden: QR Stands are permanent inventory assets and cannot be deleted. Use Unbind to release a stand.' },
    { status: 400 }
  );
}
