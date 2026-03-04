/**
 * Customer Demo Server Actions
 *
 * 提供客户画像重置等调试功能
 */
'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

/**
 * UUID 验证辅助函数
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 重置客户画像
 *
 * 功能：
 * 1. 清空客户的 profileData 为空对象
 * 2. 将状态强制重置为 D 级
 * 3. 删除该客户在 SalesStateHistory 中的所有记录
 * 4. 使用 Prisma 事务确保原子性
 */
export async function resetCustomerProfile(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 认证检查
    const { tenantId } = await requireAuth();

    // 验证 customerId 格式
    if (!customerId || !isValidUUID(customerId)) {
      console.error('[Reset Customer Failed]: Invalid customer ID format', { customerId });
      return {
        success: false,
        error: '无效的客户 ID 格式',
      };
    }

    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      // 1. 验证客户存在且属于当前租户
      const customer = await tx.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        console.error('[Reset Customer Failed]: Customer not found', {
          customerId,
          tenantId,
        });
        throw new Error('找不到该客户（可能是租户隔离导致）');
      }

      // 2. 删除该客户的所有状态历史记录
      await tx.salesStateHistory.deleteMany({
        where: {
          customerId,
          tenantId,
        },
      });

      // 3. 重置客户画像和状态
      await tx.customer.update({
        where: {
          id: customerId,
        },
        data: {
          profileData: {},
          status: 'D',
          updatedAt: new Date(),
        },
      });
    });

    console.log('[Reset Customer Success]:', { customerId, tenantId });

    // 🔥 关键修复：强制清除 Next.js 路由缓存
    revalidatePath('/customer-demo');

    return { success: true };
  } catch (error) {
    console.error('[Reset Customer Failed]:', error);
    console.error('[Reset Customer Stack]:', (error as Error).stack);
    return {
      success: false,
      error: error instanceof Error ? error.message : '重置失败',
    };
  }
}
