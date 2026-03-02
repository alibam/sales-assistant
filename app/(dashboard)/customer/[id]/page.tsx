/**
 * Customer Detail Page
 * 
 * 展示客户的详细信息、包括 AI 生成的策略和缺口追问建议。
 * 
 * M6 重构：
 * - 使用流式策略渲染（StrategyStreamer）
 * - 真正的打字机效果
 * - 实时逐字渲染
 * 
 * 安全性：
 * - tenantId 从 session 动态获取（M5）
 * - 所有数据库查询强制租户隔离
 */
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { runGapAnalysisWithState } from '@/lib/services/gap-analysis-service';
import { customerProfileSchema } from '@/lib/ai/gap-analysis';
import { requireAuth } from '@/lib/auth/session';
import { StrategyStreamer } from '@/components/strategy-streamer';
import { GapCardList } from '@/components/gap-card';
import type { CustomerProfile } from '@/lib/ai/types';
import type { ClassificationResult } from '@/lib/xstate/state-evaluator';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 获取客户数据
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
 * 客户详情页面
 */
export default async function CustomerPage({ params }: PageProps) {
  // Next.js 15: params 是 Promise，需要 await
  const { id } = await params;
  
  // ✅ M5: 从 session 动态获取 tenantId，确保租户隔离
  const session = await requireAuth();
  const tenantId = session.tenantId;
  
  // 获取客户数据
  const customer = await getCustomer(id, tenantId);
  
  if (!customer) {
    notFound();
  }
  
  // 对 profileData 进行 Zod schema 安全解析
  // 避免脏数据（如 Array、null、损坏的 JSON）进入系统
  const dbProfile = customer.profileData;
  const parseResult = customerProfileSchema.partial().safeParse(dbProfile);
  
  // 如果解析失败，返回空对象作为兜底，记录告警但不抛异常
  const profileData: Partial<CustomerProfile> = parseResult.success 
    ? parseResult.data 
    : {};
  
  if (!parseResult.success) {
    console.error('[CustomerPage] profileData parse failed', {
      customerId: customer.id,
      tenantId,
      error: parseResult.error.message,
    });
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
        {/* Strategy Card - M6 流式渲染 */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>
            📊 销售策略
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 400, 
              color: '#64748b',
              marginLeft: '8px',
            }}>
              实时生成中...
            </span>
          </h2>
          <StrategyStreamer 
            profileData={mergedProfile}
            status={classification.status}
            classification={classification}
            customerId={id}
          />
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
