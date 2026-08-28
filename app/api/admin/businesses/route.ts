/**
 * GET /api/admin/businesses
 * 
 * Scalable Businesses API with Native Firestore Server-Side Pagination, Parallel Count Aggregations, and Targeted Queries.
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import { getPaginatedBusinessesFromFirebase } from '@/lib/firebaseDb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'ALL';
    const categoryFilter = searchParams.get('category') || 'ALL';
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '25', 10)));
    const sortBy = searchParams.get('sortBy') || 'createdAt';

    const result = await getPaginatedBusinessesFromFirebase({
      page,
      limit,
      status: statusFilter,
      category: categoryFilter,
      search: searchQuery,
      sortBy: sortBy === 'name' ? 'name' : 'createdAt',
      sortOrder: 'desc',
    });

    return NextResponse.json({
      success: true,
      businesses: result.businesses,
      counts: result.counts,
      pagination: result.pagination,
      searchNote: searchQuery ? 'Substring search evaluated on filtered subset due to Firestore indexing constraints' : undefined,
    });
  } catch (error: any) {
    console.error('GET /api/admin/businesses error:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}
