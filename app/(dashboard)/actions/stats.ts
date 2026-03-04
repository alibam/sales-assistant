/**
 * Dashboard Statistics Server Actions
 *
 * 🚨 SECURITY: All queries MUST include tenantId filter
 * This is a RED LINE requirement for multi-tenant data isolation
 */

'use server';

import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { CustomerStatus } from '@prisma/client';

/**
 * Customer statistics by status (A/B/C/D)
 */
export interface CustomerStats {
  A: number;
  B: number;
  C: number;
  D: number;
}

/**
 * Follow-up customer item
 */
export interface FollowUpCustomer {
  id: string;
  name: string;
  status: CustomerStatus;
  email: string | null;
  phone: string | null;
  updatedAt: Date;
}

/**
 * Sales funnel data
 */
export interface SalesFunnel {
  D: number;
  C: number;
  B: number;
  A: number;
  conversionRates: {
    DtoC: number;
    CtoB: number;
    BtoA: number;
  };
}

/**
 * Alert item
 */
export interface Alert {
  type: 'warning' | 'danger';
  message: string;
  customerId?: string;
}

/**
 * Get customer statistics by status
 *
 * @returns Customer count by A/B/C/D status
 */
export async function getCustomerStats(): Promise<CustomerStats> {
  try {
    const session = await requireAuth();

    // 🔒 SECURITY: tenantId filter is MANDATORY
    const customers = await prisma.customer.groupBy({
      by: ['status'],
      where: {
        tenantId: session.tenantId, // ✅ RED LINE: tenantId filter
      },
      _count: {
        status: true,
      },
    });

    // Initialize with zeros
    const stats: CustomerStats = { A: 0, B: 0, C: 0, D: 0 };

    // Map results
    customers.forEach((group) => {
      stats[group.status] = group._count.status;
    });

    return stats;
  } catch (error) {
    console.error('[Dashboard Stats] Error fetching customer stats:', error);
    return { A: 0, B: 0, C: 0, D: 0 };
  }
}

/**
 * Get follow-up customer list (B/C status)
 *
 * @returns List of customers that need follow-up
 */
export async function getFollowUpCustomers(): Promise<FollowUpCustomer[]> {
  try {
    const session = await requireAuth();

    // 🔒 SECURITY: tenantId filter is MANDATORY
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: session.tenantId, // ✅ RED LINE: tenantId filter
        status: {
          in: ['B', 'C'], // B and C level customers need follow-up
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        email: true,
        phone: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10, // Limit to 10 customers
    });

    return customers;
  } catch (error) {
    console.error('[Dashboard Stats] Error fetching follow-up customers:', error);
    return [];
  }
}

/**
 * Get sales funnel data (for Manager)
 *
 * @returns Sales funnel with conversion rates
 */
export async function getSalesFunnel(): Promise<SalesFunnel> {
  try {
    const session = await requireAuth();

    // 🔒 SECURITY: tenantId filter is MANDATORY
    const customers = await prisma.customer.groupBy({
      by: ['status'],
      where: {
        tenantId: session.tenantId, // ✅ RED LINE: tenantId filter
      },
      _count: {
        status: true,
      },
    });

    // Initialize with zeros
    const funnel: SalesFunnel = {
      D: 0,
      C: 0,
      B: 0,
      A: 0,
      conversionRates: {
        DtoC: 0,
        CtoB: 0,
        BtoA: 0,
      },
    };

    // Map results
    customers.forEach((group) => {
      funnel[group.status] = group._count.status;
    });

    // Calculate conversion rates
    if (funnel.D > 0) {
      funnel.conversionRates.DtoC = (funnel.C / funnel.D) * 100;
    }
    if (funnel.C > 0) {
      funnel.conversionRates.CtoB = (funnel.B / funnel.C) * 100;
    }
    if (funnel.B > 0) {
      funnel.conversionRates.BtoA = (funnel.A / funnel.B) * 100;
    }

    return funnel;
  } catch (error) {
    console.error('[Dashboard Stats] Error fetching sales funnel:', error);
    return {
      D: 0,
      C: 0,
      B: 0,
      A: 0,
      conversionRates: { DtoC: 0, CtoB: 0, BtoA: 0 },
    };
  }
}

/**
 * Get alerts for abnormal situations (for Manager)
 *
 * @returns List of alerts
 */
export async function getAlerts(): Promise<Alert[]> {
  try {
    const session = await requireAuth();
    const alerts: Alert[] = [];

    // Alert 1: A-level customers not followed up for more than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 🔒 SECURITY: tenantId filter is MANDATORY
    const staleACustomers = await prisma.customer.count({
      where: {
        tenantId: session.tenantId, // ✅ RED LINE: tenantId filter
        status: 'A',
        updatedAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    if (staleACustomers > 0) {
      alerts.push({
        type: 'danger',
        message: `${staleACustomers} 个 A 级客户超过 7 天未跟进`,
      });
    }

    // Alert 2: B-level customers not followed up for more than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 🔒 SECURITY: tenantId filter is MANDATORY
    const staleBCustomers = await prisma.customer.count({
      where: {
        tenantId: session.tenantId, // ✅ RED LINE: tenantId filter
        status: 'B',
        updatedAt: {
          lt: threeDaysAgo,
        },
      },
    });

    if (staleBCustomers > 0) {
      alerts.push({
        type: 'warning',
        message: `${staleBCustomers} 个 B 级客户超过 3 天未跟进`,
      });
    }

    return alerts;
  } catch (error) {
    console.error('[Dashboard Stats] Error fetching alerts:', error);
    return [];
  }
}
