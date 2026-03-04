/**
 * StrategyStreamer - 流式策略渲染组件 (RSC 模式)
 * 
 * 使用 AI SDK RSC 模式：
 * - Server Action: generateStrategyStream (createStreamableValue + streamObject)
 * - Client Hook: useStreamableValue 消费流
 * 
 * 特性：
 * - 真正的流式渲染（RSC 最佳实践）
 * - 优雅处理 Partial 数据
 * - 骨架屏占位
 * - 打字机效果
 */
'use client';

import { useStreamableValue } from 'ai/rsc';
import { useEffect, useState, useTransition } from 'react';
import { generateStrategyStream, type Strategy } from '@/lib/ai/strategy-server';
import type { CustomerProfile } from '@/lib/ai/types';
import type { ClassificationResult } from '@/lib/xstate/state-evaluator';

interface StrategyStreamerProps {
  profileData: Partial<CustomerProfile>;
  status: 'A' | 'B' | 'C' | 'D';
  classification: ClassificationResult;
  customerId: string;
  customerName?: string;
  followUpInput?: string; // 新增：销售员当前的跟进原话
}

export function StrategyStreamer({
  profileData,
  status,
  classification,
  customerId,
  customerName,
  followUpInput, // 新增参数
}: StrategyStreamerProps) {
  const [isPending, startTransition] = useTransition();
  const [streamableValue, setStreamableValue] = useState<Awaited<ReturnType<typeof generateStrategyStream>> | null>(null);
  
  // 打字机效果状态
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedSummary, setDisplayedSummary] = useState('');
  const [resetKey, setResetKey] = useState(0);
  
  // 发起流式请求
  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await generateStrategyStream(
          profileData,
          status,
          classification,
          customerId,
          undefined,
          customerName,
          followUpInput // 传入跟进文本
        );
        setStreamableValue(result);
      } catch (err) {
        console.error('[StrategyStreamer] Failed to start stream:', err);
      }
    });
  }, [profileData, status, classification, customerId, customerName, followUpInput]);
  
  // 当 customerId 或 status 变化时，重置所有状态
  useEffect(() => {
    setDisplayedTitle('');
    setDisplayedSummary('');
    setResetKey(prev => prev + 1);
    setStreamableValue(null);
  }, [customerId, status]);
  
  // 消费流式数据
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, error, isLoading] = useStreamableValue<Strategy>(streamableValue as any);
  
  const object = data;
  
  // 标题打字机效果
  useEffect(() => {
    if (!object?.title) return;
    
    let index = 0;
    const fullTitle = object.title;
    
    const timer = setInterval(() => {
      if (index < fullTitle.length) {
        setDisplayedTitle(fullTitle.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    
    return () => clearInterval(timer);
  }, [object?.title, resetKey]);
  
  // 摘要打字机效果
  useEffect(() => {
    if (!object?.summary) return;
    
    let index = 0;
    const fullSummary = object.summary;
    
    const timer = setInterval(() => {
      if (index < fullSummary.length) {
        setDisplayedSummary(fullSummary.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 20);
    
    return () => clearInterval(timer);
  }, [object?.summary, resetKey]);
  
  // 加载状态
  if (isPending && !object) {
    return (
      <div style={{
        padding: '20px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ height: '24px', background: '#e2e8f0', borderRadius: '4px', width: '60%', marginBottom: '8px' }} />
          <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '4px', width: '80%' }} />
        </div>
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', padding: '20px' }}>
          🔄 AI 正在生成策略...
        </div>
      </div>
    );
  }
  
  // 错误状态
  if (error) {
    return (
      <div style={{
        padding: '16px',
        background: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fecaca',
        color: '#dc2626',
      }}>
        ⚠️ 生成失败: {String(error)}
      </div>
    );
  }
  
  // 空状态
  if (!object) {
    return (
      <div style={{ padding: '16px', color: '#64748b', textAlign: 'center' }}>
        等待生成...
      </div>
    );
  }
  
  return (
    <div key={resetKey} style={{
      padding: '20px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      {/* 标题（打字机效果） */}
      <h3 style={{ 
        fontSize: '20px', 
        fontWeight: 700, 
        color: '#0f172a', 
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {displayedTitle || object.title || '...'}
        {displayedTitle !== object.title && object.title && (
          <span style={{ opacity: 0.5, fontSize: '16px' }}>▊</span>
        )}
      </h3>
      
      {/* 优先级徽章 */}
      {object.priority && (
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          background: object.priority === '高' ? '#fef2f2' :
                     object.priority === '中' ? '#fff7ed' : '#f0fdf4',
          color: object.priority === '高' ? '#dc2626' :
                 object.priority === '中' ? '#ea580c' : '#059669',
          marginBottom: '12px',
        }}>
          {object.priority}优先级
        </span>
      )}
      
      {/* 摘要（打字机效果） */}
      <p style={{ 
        fontSize: '14px', 
        color: '#64748b', 
        marginBottom: '16px',
        lineHeight: 1.6,
      }}>
        {displayedSummary || object.summary || '...'}
        {displayedSummary !== object.summary && object.summary && (
          <span style={{ opacity: 0.5 }}>▊</span>
        )}
      </p>
      
      {/* 话术建议（流式渲染） */}
      {object.talkTracks && object.talkTracks.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
            💬 话术建议
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {object.talkTracks.map((track, index) => (
              <TalkTrackCard key={index} track={track} />
            ))}
          </div>
        </div>
      )}
      
      {/* 行动计划（流式渲染） */}
      {object.actionPlan && object.actionPlan.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
            ✅ 行动计划
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {object.actionPlan.map((step, index) => (
              <ActionStepCard key={index} step={step} index={index + 1} />
            ))}
          </div>
        </div>
      )}
      
      {/* 下次跟进 */}
      {object.nextFollowUp && (
        <div style={{ 
          padding: '12px', 
          background: '#f8fafc', 
          borderRadius: '8px',
          borderLeft: '4px solid #2563eb',
        }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
            📅 下次跟进建议
          </p>
          <p style={{ fontSize: '14px', color: '#0f172a' }}>
            {object.nextFollowUp}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 话术卡片组件
 */
function TalkTrackCard({ track }: { track: Partial<NonNullable<Strategy>['talkTracks'][0]> }) {
  return (
    <div style={{ 
      padding: '12px', 
      background: '#f8fafc', 
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
          {track.objective || '...'}
        </span>
        {track.tone && (
          <span style={{
            fontSize: '12px',
            padding: '2px 8px',
            background: track.tone === '坚定' ? '#fef2f2' :
                       track.tone === '顾问式' ? '#eff6ff' : '#f0fdf4',
            color: track.tone === '坚定' ? '#dc2626' :
                   track.tone === '顾问式' ? '#2563eb' : '#059669',
            borderRadius: '4px',
          }}>
            {track.tone}
          </span>
        )}
      </div>
      <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
        {track.script || '...'}
      </p>
      {track.whenToUse && (
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
          📌 使用场景: {track.whenToUse}
        </p>
      )}
    </div>
  );
}

/**
 * 行动步骤卡片组件
 */
function ActionStepCard({ step, index }: { step: Partial<NonNullable<Strategy>['actionPlan'][0]>, index: number }) {
  return (
    <div style={{ 
      padding: '10px 12px', 
      background: '#f8fafc', 
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <span style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: '#2563eb',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {index}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
          {step.step || '...'}
        </p>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
          {step.owner && <span>👤 {step.owner}</span>}
          {step.dueWindow && <span>⏰ {step.dueWindow}</span>}
        </div>
        {step.expectedSignal && (
          <p style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            ✓ 预期信号: {step.expectedSignal}
          </p>
        )}
      </div>
    </div>
  );
}
