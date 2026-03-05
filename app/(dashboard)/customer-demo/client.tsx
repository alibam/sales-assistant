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
import { resetCustomerProfile, handleFollowUp } from './actions';
import { TEST_CUSTOMER_IDS } from '@/lib/db/fixtures';
import type { ProfileGap } from '@/lib/ai/types';

interface SeedCustomer {
  name: string;
  profile: CustomerProfile;
  classification: ClassificationResult;
}

interface Props {
  customer: SeedCustomer;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
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

  // Dual-track state
  const [isPostCallMode, setIsPostCallMode] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const [missingFields, setMissingFields] = useState<ProfileGap[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isFollowUpMode, setIsFollowUpMode] = useState(true); // Toggle between follow-up and strategy generation

  function handleGenerate() {
    if (!followUpText.trim()) return;

    startTransition(async () => {
      try {
        if (isFollowUpMode) {
          // Dual-track follow-up mode
          const result = await handleFollowUp(
            TEST_CUSTOMER_IDS.ZHANG_WEI,
            followUpText,
            isPostCallMode ? 'postCall' : 'copilot',
          );

          // Update state
          setCompletionRate(result.completionRate);
          setMissingFields(result.missingFields);
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', content: followUpText },
            { role: 'assistant', content: result.aiResponse },
          ]);

          // Clear input
          setFollowUpText('');

          // If completion >= 80%, switch to strategy generation mode
          if (result.completionRate >= 80) {
            setIsFollowUpMode(false);
          }
        } else {
          // Strategy generation mode
          const stream = await generateStrategyStream(
            customer.profile,
            customer.classification.status,
            customer.classification,
            TEST_CUSTOMER_IDS.ZHANG_WEI,
            customer.profile,
            customer.name,
            followUpText,
          );
          setStreamableValue(stream);
        }
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

      {/* Progress Bar */}
      {isFollowUpMode && (
        <section style={{
          padding: '24px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            画像完成度
          </h2>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '32px',
            background: '#f1f5f9',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: '16px',
          }}>
            <div
              style={{
                width: `${completionRate}%`,
                height: '100%',
                background: completionRate >= 80 ? '#10b981' : completionRate >= 60 ? '#3b82f6' : completionRate >= 30 ? '#f59e0b' : '#ef4444',
                transition: 'all 500ms ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '12px',
              }}
            >
              <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
                {completionRate}%
              </span>
            </div>
          </div>

          {/* Missing fields */}
          {missingFields.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#64748b' }}>
                待补充字段（前3项）：
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {missingFields.slice(0, 3).map((field, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      background: field.priority === 'critical' ? '#fef2f2' : field.priority === 'high' ? '#fffbeb' : '#f8fafc',
                      border: `1px solid ${field.priority === 'critical' ? '#fecaca' : field.priority === 'high' ? '#fde047' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#475569',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {field.priority === 'critical' ? '🔴' : field.priority === 'high' ? '🟡' : '⚪'}
                    </span>
                    {' '}
                    {field.sectionTitle} → {field.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 跟进记录输入区 */}
      <section style={{
        padding: '24px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          {isFollowUpMode ? '跟进记录' : 'AI 策略生成'}
        </h2>

        {/* Mode toggle */}
        {isFollowUpMode && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPostCallMode}
                onChange={(e) => setIsPostCallMode(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#475569' }}>
                事后复盘模式（Post-Call）
              </span>
            </label>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {isPostCallMode ? '💬 AI 会追问您补全画像' : '🎯 AI 会生成给客户的话术'}
            </span>
          </div>
        )}

        <textarea
          data-testid="followup-input"
          placeholder={
            isFollowUpMode
              ? isPostCallMode
                ? '请输入通话录音总结或客户信息...'
                : '请输入客户说了什么...'
              : '请输入跟进记录...'
          }
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
          {isPending ? '处理中...' : isFollowUpMode ? '提交跟进' : '生成 AI 策略'}
        </button>

        {!isFollowUpMode && (
          <button
            onClick={() => setIsFollowUpMode(true)}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: '#64748b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: '12px',
            }}
          >
            返回跟进模式
          </button>
        )}

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

      {/* Conversation History */}
      {isFollowUpMode && conversationHistory.length > 0 && (
        <section style={{
          padding: '24px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            对话历史
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: msg.role === 'user' ? '#f0f9ff' : '#f0fdf4',
                  borderRadius: '8px',
                  border: `1px solid ${msg.role === 'user' ? '#bae6fd' : '#bbf7d0'}`,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  {msg.role === 'user' ? '👤 您' : '🤖 AI'}
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
