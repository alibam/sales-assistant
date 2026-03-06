/**
 * Customer Demo Page - 客户演示页面
 * 
 * 展示种子用户（张伟/李娜）的 A/B/C/D 画像信息
 * 支持跟进记录输入和 AI 策略流式生成
 * 
 * BDD 测试驱动开发：
 * - tests/customer-demo.spec.ts
 */
import { requireAuth } from '@/lib/auth/session';
import { CustomerDemoClient } from './client';
import type { CustomerProfile } from '@/lib/ai/types';
import { TEST_CUSTOMER_IDS } from '@/lib/db/fixtures';
import { prisma } from '@/lib/db/client';

export default async function CustomerDemoPage() {
  // 验证登录状态
  const session = await requireAuth();
  
  // 从数据库中读取真实的客户数据
  const customer = await prisma.customer.findUnique({
    where: {
      id: TEST_CUSTOMER_IDS.ZHANG_WEI,
      tenantId: session.tenantId,
    },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // 将数据库数据转换为客户端需要的格式
  const customerData = {
    id: customer.id,
    name: customer.name,
    profile: customer.profileData as CustomerProfile,  // 使用 profileData 字段
    classification: {
      status: customer.status,
      reason: '',  // 暂时使用空字符串，后续可以从 SalesStateHistory 中读取
      confidence: 'high' as const,
    },
  };
  
  return <CustomerDemoClient customer={customerData} />;
}
