import { NextResponse } from 'next/server';
import { getJsonBusinesses } from '@/lib/jsonDb';

// In-memory feedback collection for demo/runtime
let MOCK_FEEDBACKS = [
  {
    id: 'fb-1',
    businessId: 'biz-1',
    rating: 2,
    customerName: 'Rahul Verma',
    customerContact: '+91 98765 43210',
    message: 'The dosa was cold and filter coffee took 25 minutes to arrive.',
    status: 'UNRESOLVED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'fb-2',
    businessId: 'biz-2',
    rating: 1,
    customerName: 'Ananya Sharma',
    customerContact: 'ananya@gmail.com',
    message: 'Treadmill #3 display screen stopped working during workout.',
    status: 'UNRESOLVED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'fb-3',
    businessId: 'biz-3',
    rating: 3,
    customerName: 'Karan Patel',
    customerContact: null,
    message: 'Coffee was good but seating area was too noisy.',
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');

    const businesses = getJsonBusinesses();

    let result = MOCK_FEEDBACKS.map((f) => {
      const biz = businesses.find((b) => b.id === f.businessId);
      return {
        ...f,
        business: biz ? { id: biz.id, name: biz.name, slug: biz.slug } : { id: f.businessId, name: 'Store', slug: '' },
      };
    });

    if (businessId && businessId !== 'ALL') {
      result = result.filter((f) => f.businessId === businessId);
    }

    if (status && status !== 'ALL') {
      result = result.filter((f) => f.status === status);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch feedbacks' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { feedbackId, status } = body;

    MOCK_FEEDBACKS = MOCK_FEEDBACKS.map((f) => {
      if (f.id === feedbackId) {
        return { ...f, status: status || 'RESOLVED' };
      }
      return f;
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update feedback status' }, { status: 500 });
  }
}
