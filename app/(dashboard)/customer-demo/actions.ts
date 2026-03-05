/**
 * Customer Demo Server Actions
 *
 * 提供客户画像重置、双轨跟进等功能
 */
'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { processDualTrack, type DualTrackOutput } from '@/lib/ai/dual-track-engine';
import type { CustomerProfile } from '@/lib/ai/types';

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

/**
 * Handle dual-track follow-up interaction
 *
 * 功能：
 * 1. 获取客户当前画像（租户隔离）
 * 2. 获取对话历史（租户隔离）
 * 3. 调用双轨引擎处理用户输入
 * 4. 保存对话记录（租户隔离）
 * 5. 更新客户画像（租户隔离）
 */
export async function handleFollowUp(
  customerId: string,
  userInput: string,
  mode: 'copilot' | 'postCall',
): Promise<DualTrackOutput> {
  const { tenantId } = await requireAuth();

  // 1. 获取客户当前画像（租户隔离）
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
    },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // 2. 获取对话历史（租户隔离）
  const history = await prisma.conversationHistory.findMany({
    where: {
      customerId,
      tenantId,
    },
    orderBy: { createdAt: 'asc' },
    take: 10, // Limit to last 10 messages
  });

  // 3. 调用双轨引擎
  const result = await processDualTrack({
    mode,
    customerProfile: customer.profileData as Partial<CustomerProfile>,
    userInput,
    conversationHistory: history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
  });

  // 4. 保存对话记录（租户隔离）
  await prisma.conversationHistory.create({
    data: {
      customerId,
      tenantId,
      role: 'user',
      content: userInput,
      mode,
    },
  });

  await prisma.conversationHistory.create({
    data: {
      customerId,
      tenantId,
      role: 'assistant',
      content: result.aiResponse,
      mode,
    },
  });

  // 5. 更新客户画像（租户隔离）
  if (result.updatedProfile) {
    await prisma.customer.update({
      where: {
        id: customerId,
        tenantId: tenantId,
      },
      data: {
        profileData: result.updatedProfile as any,
        updatedAt: new Date(),
      },
    });
  }

  // 强制清除 Next.js 路由缓存
  revalidatePath('/customer-demo');

  return result;
}
