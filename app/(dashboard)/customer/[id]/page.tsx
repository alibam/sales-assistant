/**
 * Customer Detail Page
 * 
 * 展示客户的详细信息、包括 AI 生成的策略和缺口追问建议。
 * 使用 RSC 实现流式渲染。
 */
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { runGapAnalysisWithState } from '@/lib/services/gap-analysis-service';
import { generateStrategy } from '@/lib/ai/strategy-generator';
import { StrategyCard } from '@/components/strategy-card';
import { GapCardList } from '@/components/gap-card';
import type { CustomerProfile } from '@/lib/ai/types';
import type { ClassificationResult } from '@/lib/xstate/state-evaluator';

interface PageProps {
  params: {
    id: string;
  };
}

/**
 * 获取客户数据
 * 
 * TODO(Milestone 5): tenantId 必须从认证上下文提取，禁止硬编码
 */
async function getCustomer(id: string, tenantId: string) {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        profileData: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return customer;
  } catch (error) {
    console.error('Database error in getCustomer:', error);
    return null;
  }
}

/**
 * 生成策略（服务端组件）
 */
async function StrategySection({ 
  profileData, 
  status,
  classification 
}: { 
  profileData: CustomerProfile; 
  status: 'A' | 'B' | 'C' | 'D';
  classification: ClassificationResult;
}) {
  try {
    const strategy = await generateStrategy(
      profileData,
      status,
      classification
    );
    
    return <StrategyCard {...strategy} />;
  } catch (error) {
    // 不向 UI 暴露内部错误细节
    console.error('Strategy generation failed:', error);
    return (
      <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
        <p style={{ color: '#dc2626' }}>策略生成失败，请稍后重试</p>
      </div>
    );
  }
}

/**
 * 客户详情页面
 */
export default async function CustomerPage({ params }: PageProps) {
  const { id } = params;
  
  // TODO(Milestone 5): 从认证上下文获取 tenantId
  // 当前为演示模式，必须通过环境变量配置，无默认值
  const tenantId = process.env.DEMO_TENANT_ID;
  
  if (!tenantId) {
    throw new Error('DEMO_TENANT_ID environment variable is required');
  }
  
  // 获取客户数据
  const customer = await getCustomer(id, tenantId);
  
  if (!customer) {
    notFound();
  }
  
  // 对 profileData 进行类型安全验证，避免脏数据进入系统
  let profileData: Partial<CustomerProfile> = {};
  if (customer.profileData && typeof customer.profileData === 'object') {
    // 简单的结构检查，防止完全损坏的数据
    // TODO: 使用 Zod schema.safeParse 进行完整验证
    profileData = customer.profileData as Partial<CustomerProfile>;
  }
  
  // 运行 Gap Analysis
  const analysisResult = await runGapAnalysisWithState(
    '', // 空输入，使用现有 profile
    profileData,
    tenantId,
    id
  );
  
  const mergedProfile = analysisResult.mergedProfile;
  const classification = analysisResult.classification;
  const gaps = analysisResult.gaps;
  
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          {customer.name}
        </h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: 600,
            background: classification.status === 'A' ? '#059669' :
                       classification.status === 'B' ? '#d97706' :
                       classification.status === 'C' ? '#2563eb' : '#6b7280',
            color: '#ffffff',
          }}>
            {classification.status} 类客户
          </span>
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            置信度: {classification.confidence}
          </span>
        </div>
      </header>
      
      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Strategy Card */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>
            📊 销售策略
          </h2>
          <Suspense fallback={<div style={{ padding: '16px', color: '#64748b' }}>加载中...</div>}>
            <StrategySection 
              profileData={mergedProfile}
              status={classification.status}
              classification={classification}
            />
          </Suspense>
        </div>
        
        {/* Gap Analysis */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>
            🔍 信息缺口
          </h2>
          {gaps.length > 0 ? (
            <GapCardList gaps={gaps} />
          ) : (
            <div style={{ 
              padding: '16px', 
              background: '#f0fdf4', 
              borderRadius: '8px',
              color: '#059669',
            }}>
              ✅ 客户信息已完整
            </div>
          )}
        </div>
      </div>
      
      {/* Profile Completeness */}
      <div style={{ 
        padding: '16px', 
        background: '#f8fafc', 
        borderRadius: '8px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
          📈 信息完整度
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            flex: 1,
            height: '8px',
            background: '#e2e8f0',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${analysisResult.completeness}%`,
              height: '100%',
              background: analysisResult.completeness >= 80 ? '#059669' :
                           analysisResult.completeness >= 60 ? '#d97706' :
                           analysisResult.completeness >= 40 ? '#2563eb' : '#dc2626',
            }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
            {analysisResult.completeness}%
          </span>
        </div>
      </div>
    </div>
  );
}
