/**
 * Customer History API
 *
 * GET /api/customer/[customerId]/history
 *
 * Returns the sales state history for a specific customer.
 * Used for testing and verification purposes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    // Verify authentication
    const session = await requireAuth();

    const { customerId } = params;

    // Fetch customer history from database
    const history = await prisma.salesStateHistory.findMany({
      where: {
        customerId,
        tenantId: session.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        fromState: true,
        toState: true,
        reason: true,
        createdAt: true,
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('[Customer History API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer history' },
      { status: 500 }
    );
  }
}
