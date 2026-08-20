import { NextResponse } from 'next/server';
import { getJsonBusinesses, getJsonStands } from '@/lib/jsonDb';

export async function GET() {
  try {
    const businesses = getJsonBusinesses();
    const stands = getJsonStands();

    const assignedStands = stands.filter((s) => s.status === 'ASSIGNED' || s.businessId).length;
    const unassignedStands = stands.length - assignedStands;

    return NextResponse.json({
      totalBusinesses: businesses.length,
      totalStands: stands.length,
      assignedStands,
      unassignedStands,
      totalFeedbacks: 12,
      unresolvedFeedbacks: 3,
      totalAnalytics: 148,
      googleBoosts: 89,
      recentAnalytics: [
        {
          id: 'log-1',
          type: 'STAND_SCAN',
          business: { name: 'Bangalore House' },
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: 'log-2',
          type: 'GOOGLE_BOOST',
          business: { name: 'FitGym Center' },
          createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        },
        {
          id: 'log-3',
          type: 'PRIVATE_FEEDBACK',
          business: { name: 'Cafe Delight' },
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to calculate metrics' },
      { status: 500 }
    );
  }
}
