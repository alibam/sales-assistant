/**
 * StrategyStreamer - 流式策略渲染组件
 * 
 * 使用 Vercel AI SDK 的 useObject hook 消费流式数据。
 * 实现真正的打字机效果，逐字渲染策略内容。
 * 
 * 特性：
 * - 实时流式渲染
 * - 优雅处理 Partial 数据
 * - 骨架屏占位
 * - 打字机效果
 */
'use client';

import { useObject } from 'ai/react';
import { z } from 'zod';
import { useEffect, useState } from 'react';

// ── Zod Schema (与 API 保持一致) ──

const talkTrackSchema = z.object({
  objective: z.string(),
  script: z.string(),
  whenToUse: z.string(),
  tone: z.enum(['坚定', '顾问式', '共情式']),
});

const actionStepSchema = z.object({
  step: z.string(),
  owner: z.enum(['销售顾问', '销售经理', '金融专员']),
  dueWindow: z.string(),
  expectedSignal: z.string(),
});

const strategySchema = z.object({
  title: z.string(),
  summary: z.string(),
  priority: z.enum(['高', '中', '低']),
  talkTracks: z.array(talkTrackSchema),
  actionPlan: z.array(actionStepSchema),
  nextFollowUp: z.string(),
});

type Strategy = z.infer<typeof strategySchema>;

interface StrategyStreamerProps {
  profileData: any;
  status: 'A' | 'B' | 'C' | 'D';
  classification: any;
  customerId: string;
}

/**
 * 流式策略渲染组件
 */
export function StrategyStreamer({
  profileData,
  status,
  classification,
  customerId,
}: StrategyStreamerProps) {
  // 使用 useObject 消费流式数据
  const { object, error, isLoading } = useObject<Strategy>({
    api: '/api/strategy',
    schema: strategySchema,
    body: {
      profileData,
      status,
      classification,
      customerId,
    },
  });
  
  // 打字机效果状态
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedSummary, setDisplayedSummary] = useState('');
  
  // 标题打字机效果
  useEffect(() => {
    if (object?.title && object.title !== displayedTitle) {
      const fullText = object.title;
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedTitle(fullText.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 30); // 30ms 每字符
      
      return () => clearInterval(interval);
    }
  }, [object?.title]);
  
  // 摘要打字机效果
  useEffect(() => {
    if (object?.summary && object.summary !== displayedSummary) {
      const fullText = object.summary;
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedSummary(fullText.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 15); // 15ms 每字符
      
      return () => clearInterval(interval);
    }
  }, [object?.summary]);
  
  // 错误处理
  if (error) {
    return (
      <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
        <p style={{ color: '#dc2626' }}>策略生成失败</p>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
          {error.message}
        </p>
      </div>
    );
  }
  
  // 加载中：显示骨架屏
  if (isLoading && !object) {
    return (
      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
        <div style={{ 
          height: '24px', 
          background: '#e2e8f0', 
          borderRadius: '4px',
          marginBottom: '12px',
          animation: 'pulse 2s infinite',
        }} />
        <div style={{ 
          height: '16px', 
          background: '#e2e8f0', 
          borderRadius: '4px',
          width: '80%',
          animation: 'pulse 2s infinite',
        }} />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }
  
  // 流式渲染
  return (
    <div style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      {/* 标题（打字机效果） */}
      <h3 style={{ 
        fontSize: '20px', 
        fontWeight: 600, 
        color: '#0f172a', 
        marginBottom: '8px' 
      }}>
        {displayedTitle || object?.title || '...'}
        {displayedTitle !== object?.title && <span style={{ opacity: 0.5 }}>▊</span>}
      </h3>
      
      {/* 优先级徽章 */}
      {object?.priority && (
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '12px',
          background: object.priority === '高' ? '#fef2f2' :
                      object.priority === '中' ? '#fffbeb' : '#f0fdf4',
          color: object.priority === '高' ? '#dc2626' :
                 object.priority === '中' ? '#d97706' : '#059669',
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
        {displayedSummary || object?.summary || '...'}
        {displayedSummary !== object?.summary && <span style={{ opacity: 0.5 }}>▊</span>}
      </p>
      
      {/* 话术建议（流式渲染） */}
      {object?.talkTracks && object.talkTracks.length > 0 && (
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
      {object?.actionPlan && object.actionPlan.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
            ✅ 行动计划
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {object.actionPlan.map((step, index) => (
              <ActionStepCard key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      )}
      
      {/* 下次跟进 */}
      {object?.nextFollowUp && (
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
function TalkTrackCard({ track }: { track: Partial<z.infer<typeof talkTrackSchema>> }) {
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
          📌 使用时机: {track.whenToUse}
        </p>
      )}
    </div>
  );
}

/**
 * 行动步骤卡片组件
 */
function ActionStepCard({ step, index }: { step: Partial<z.infer<typeof actionStepSchema>>, index: number }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: '12px',
      padding: '8px',
      background: '#ffffff',
      borderRadius: '6px',
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        background: '#2563eb',
        color: '#ffffff',
        borderRadius: '50%',
        fontSize: '12px',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {index + 1}
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
            ✨ 期望信号: {step.expectedSignal}
          </p>
        )}
      </div>
    </div>
  );
}
