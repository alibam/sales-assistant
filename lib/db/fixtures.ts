/**
 * Type-Safe Test Fixtures
 *
 * Centralized mock data factory for tests and development.
 * All UUIDs conform to Prisma Schema constraints (UUID v4 format).
 *
 * Usage:
 * - Import fixtures in tests: `import { TEST_TENANT, TEST_USERS } from '@/lib/db/fixtures'`
 * - Use in mock APIs: `const session = TEST_USERS.DEMO_SALES_REP`
 * - Extend with factory functions for dynamic test data
 */

import { CustomerStatus } from './client';

/**
 * Test Tenant IDs
 * Standard UUID format: 8-4-4-4-12 hex digits
 */
export const TEST_TENANT_IDS = {
  /** AutoMax 4S Shop - Primary test tenant */
  AUTOMAX: '00000000-0000-0000-0000-000000000001' as const,
  /** Secondary test tenant for multi-tenant scenarios */
  SECONDARY: '00000000-0000-0000-0000-000000000006' as const,
} as const;

/**
 * Test User IDs
 */
export const TEST_USER_IDS = {
  /** Demo sales representative */
  DEMO_SALES_REP: '00000000-0000-0000-0000-000000000002' as const,
  /** Demo sales manager */
  DEMO_SALES_MANAGER: '00000000-0000-0000-0000-000000000004' as const,
  /** Demo tenant admin */
  DEMO_TENANT_ADMIN: '00000000-0000-0000-0000-000000000005' as const,
} as const;

/**
 * Test Customer IDs
 */
export const TEST_CUSTOMER_IDS = {
  /** 张伟 - A级客户 (Ready to buy) */
  ZHANG_WEI: '00000000-0000-0000-0000-000000000003' as const,
} as const;

/**
 * Type-Safe User Session Fixtures
 * Matches Session type from @/lib/auth/session
 */
export const TEST_USERS = {
  DEMO_SALES_REP: {
    userId: TEST_USER_IDS.DEMO_SALES_REP,
    tenantId: TEST_TENANT_IDS.AUTOMAX,
    role: 'SALES_REP' as const,
  },
  DEMO_SALES_MANAGER: {
    userId: TEST_USER_IDS.DEMO_SALES_MANAGER,
    tenantId: TEST_TENANT_IDS.AUTOMAX,
    role: 'SALES_MANAGER' as const,
  },
  DEMO_TENANT_ADMIN: {
    userId: TEST_USER_IDS.DEMO_TENANT_ADMIN,
    tenantId: TEST_TENANT_IDS.SECONDARY,
    role: 'TENANT_ADMIN' as const,
  },
} as const;

/**
 * Test Tenant Fixtures
 */
export const TEST_TENANTS = {
  AUTOMAX: {
    id: TEST_TENANT_IDS.AUTOMAX,
    name: 'AutoMax 4S Shop',
    settings: {
      locale: 'zh-CN',
      industry: 'automotive_4s',
      profileSchemaVersion: '1.0.0',
      features: {
        aiGapAnalysis: true,
        voiceTranscription: true,
      },
    },
  },
} as const;

/**
 * Test Customer Fixtures
 */
export const TEST_CUSTOMERS = {
  ZHANG_WEI: {
    id: TEST_CUSTOMER_IDS.ZHANG_WEI,
    tenantId: TEST_TENANT_IDS.AUTOMAX,
    name: '张伟',
    email: 'zhang.wei@example.com',
    phone: '13800001111',
    status: CustomerStatus.A,
    profileData: {
      budget: { range: '300k-500k', confirmed: true, financing_needed: false },
      decision_maker: { role: 'self', identified: true },
      timeframe: { urgency: 'immediate', trigger_event: 'Current lease expires next week' },
      vehicle_model: { brand: 'BMW', model: 'X5 xDrive40Li', configuration: 'M Sport', color_preference: 'Carbon Black' },
      trade_in_info: { has_trade_in: true, current_vehicle: '2019 Audi Q5L', estimated_value: 180000 },
      contact_preferences: { preferred_channel: 'wechat', best_time: 'weekday evenings' },
    },
  },
} as const;

/**
 * Factory function to create a test customer with custom overrides
 *
 * @example
 * const testCustomer = createTestCustomer({
 *   name: '李明',
 *   status: CustomerStatus.B,
 * });
 */
export function createTestCustomer(overrides: {
  id?: string;
  tenantId?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: CustomerStatus;
  profileData?: Record<string, unknown>;
}) {
  return {
    id: overrides.id ?? '123e4567-e89b-12d3-a456-426614174000',
    tenantId: overrides.tenantId ?? TEST_TENANT_IDS.AUTOMAX,
    name: overrides.name ?? 'Test Customer',
    email: overrides.email ?? 'test@example.com',
    phone: overrides.phone ?? '13800000000',
    status: overrides.status ?? CustomerStatus.D,
    profileData: overrides.profileData ?? {},
  };
}

/**
 * Factory function to create a test user session with custom overrides
 */
export function createTestSession(overrides: {
  userId?: string;
  tenantId?: string;
  role?: 'SALES_REP' | 'SALES_MANAGER' | 'TENANT_ADMIN';
}) {
  return {
    userId: overrides.userId ?? TEST_USER_IDS.DEMO_SALES_REP,
    tenantId: overrides.tenantId ?? TEST_TENANT_IDS.AUTOMAX,
    role: overrides.role ?? 'SALES_REP',
  };
}
