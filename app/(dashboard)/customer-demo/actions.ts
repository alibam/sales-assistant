/**
 * Customer Demo Server Actions
 *
 * 提供客户画像重置等调试功能
 */
'use server';

import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

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
        throw new Error('客户不存在或无权访问');
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
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('[Reset Customer] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '重置失败',
    };
  }
}
