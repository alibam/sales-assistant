/**
 * Customer Demo Client Component
 * 
 * 客户端交互组件，处理跟进记录输入和 AI 策略流式生成
 */
'use client';

import React, { useState, useTransition } from 'react';
import { useStreamableValue } from 'ai/rsc';
import { useRouter } from 'next/navigation';
import { generateStrategyStream, type Strategy } from '@/lib/ai/strategy-server';
import type { CustomerProfile } from '@/lib/ai/types';
import type { ClassificationResult } from '@/lib/xstate/state-evaluator';
import { resetCustomerProfile } from './actions';
import { TEST_CUSTOMER_IDS } from '@/lib/db/fixtures';

interface SeedCustomer {
  name: string;
  profile: CustomerProfile;
  classification: ClassificationResult;
}

interface Props {
  customer: SeedCustomer;
}

export function CustomerDemoClient({ customer }: Props) {
  const router = useRouter();
  const [followUpText, setFollowUpText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isResetting, setIsResetting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [streamableValue, setStreamableValue] = useState<any>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, error] = useStreamableValue<any>(streamableValue);

  function handleGenerate() {
    if (!followUpText.trim()) return;

    startTransition(async () => {
      try {
        // 调用真实的 Server Action，获取流式值
        // 传递 customer.profile 作为 existingProfile
        const stream = await generateStrategyStream(
          customer.profile,
          customer.classification.status,
          customer.classification,
          TEST_CUSTOMER_IDS.ZHANG_WEI, // Use Type-Safe fixture
          customer.profile, // existingProfile
          customer.name, // customerName
          followUpText // followUpInput - 传入用户刚刚输入的跟进文本
        );
        setStreamableValue(stream);
      } catch (err) {
        console.error('生成失败:', err);
      }
    });
  }

  async function handleReset() {
    if (!confirm('确定要重置此客户的画像数据吗？此操作不可撤销！')) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetCustomerProfile(TEST_CUSTOMER_IDS.ZHANG_WEI); // Use Type-Safe fixture
      if (result.success) {
        alert('✅ 客户画像已重置');
        // 🔥 关键修复：强制刷新页面，彻底清空 React 内存里的残留状态
        window.location.reload();
      } else {
        alert(`❌ 重置失败: ${result.error}`);
      }
    } catch (err) {
      console.error('重置失败:', err);
      alert('❌ 重置失败');
    } finally {
      setIsResetting(false);
    }
  }

  const showSkeleton = isPending && !data;
  const isGenerating = isPending;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>
        📊 客户演示 - {customer.name}
      </h1>
      
      {/* A/B/C/D 画像信息区 */}
      <section style={{
        padding: '24px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          客户画像 (A/B/C/D)
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {/* A: 需求与场景 */}
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#2563eb' }}>
              A - 需求与场景
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              使用场景: {customer.profile.scene?.usage_scenario}
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              关键动机: {customer.profile.scene?.key_motives?.join(', ')}
            </p>
          </div>
          
          {/* B: 车型与偏好 */}
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#10b981' }}>
              B - 车型与偏好
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              意向车型: {customer.profile.preference?.intent_model}
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              配置偏好: {customer.profile.preference?.config_preference?.join(', ')}
            </p>
          </div>
          
          {/* C: 预算与时间 */}
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#f59e0b' }}>
              C - 预算与时间
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              预算: {customer.profile.budget_payment?.budget_limit}
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              付款方式: {customer.profile.budget_payment?.payment_method}
            </p>
          </div>
          
          {/* D: 决策与顾虑 */}
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#ef4444' }}>
              D - 决策与顾虑
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              决策人参与: {customer.profile.decision_unit?.decision_maker_involved ? '是' : '否'}
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              主要顾虑: {customer.profile.blockers?.main_blocker}
            </p>
          </div>
        </div>
        
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#dbeafe',
          borderRadius: '8px',
          border: '1px solid #3b82f6',
        }}>
          <p style={{ fontSize: '14px', color: '#1e40af', fontWeight: 600 }}>
            当前状态: {customer.classification.status} 级客户
          </p>
          <p style={{ fontSize: '14px', color: '#1e40af' }}>
            {customer.classification.reason}
          </p>
        </div>
      </section>
      
      {/* 跟进记录输入区 */}
      <section style={{
        padding: '24px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          跟进记录
        </h2>
        
        <textarea
          data-testid="followup-input"
          placeholder="请输入跟进记录..."
          value={followUpText}
          onChange={(e) => setFollowUpText(e.target.value)}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        
        <button
          onClick={handleGenerate}
          disabled={isPending || !followUpText.trim()}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: isPending ? '#94a3b8' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            marginRight: '12px',
          }}
        >
          {isPending ? '生成中...' : '生成 AI 策略'}
        </button>

        <button
          onClick={handleReset}
          disabled={isResetting}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: isResetting ? '#fca5a5' : '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: isResetting ? 'not-allowed' : 'pointer',
          }}
        >
          {isResetting ? '重置中...' : '🧹 重置此客户画像'}
        </button>
      </section>
      
      {/* 骨架屏 */}
      {showSkeleton && (
        <div
          data-testid="strategy-skeleton"
          style={{
            padding: '24px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}
        >
          <div className="animate-pulse">
            <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '12px', width: '60%' }} />
            <div style={{ height: '16px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' }} />
            <div style={{ height: '16px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px', width: '90%' }} />
            <div style={{ height: '16px', background: '#e2e8f0', borderRadius: '4px', width: '80%' }} />
          </div>
        </div>
      )}
      
      {/* 流式生成区 */}
      {data && (
        <div
          data-testid="strategy-stream-region"
          aria-live="polite"
          style={{
            padding: '24px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            🤖 AI 策略建议
          </h2>
          
          {/* 摘要 */}
          {data.summary && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#2563eb' }}>
                📊 {data.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                {data.summary}
              </p>
            </div>
          )}
          
          {/* 话术建议 */}
          {data.talkTracks && data.talkTracks.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#10b981' }}>
                💬 话术建议
              </h3>
              {data.talkTracks.map((track: any, idx: number) => (
                <div key={idx} style={{
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  border: '1px solid #86efac',
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>
                    {track.objective}
                  </p>
                  <p style={{ fontSize: '14px', color: '#15803d', marginBottom: '4px' }}>
                    {track.script}
                  </p>
                  <p style={{ fontSize: '12px', color: '#16a34a' }}>
                    语气: {track.tone} | 使用时机: {track.whenToUse}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* 行动计划 */}
          {data.actionPlan && data.actionPlan.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#f59e0b' }}>
                📋 行动计划
              </h3>
              {data.actionPlan.map((action: any, idx: number) => (
                <div key={idx} style={{
                  padding: '12px',
                  background: '#fffbeb',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  border: '1px solid #fde047',
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
                    {action.step}
                  </p>
                  <p style={{ fontSize: '12px', color: '#b45309' }}>
                    负责人: {action.owner} | 时间: {action.dueWindow}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* 下次跟进建议 */}
          {data.nextFollowUp && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                📅 下次跟进: {data.nextFollowUp}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div style={{
          padding: '16px',
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: '8px',
          color: '#dc2626',
        }}>
          ⚠️ 生成失败: {String(error)}
        </div>
      )}
    </div>
  );
}
