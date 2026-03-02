/**
 * Strategy Card Component
 * 
 * 展示 AI 生成的销售策略，包括话术建议和行动计划。
 */

export interface StrategyTalkTrack {
  objective: string;
  script: string;
  whenToUse: string;
  tone: '坚定' | '顾问式' | '共情式';
}

export interface StrategyActionStep {
  step: string;
  owner: '销售顾问' | '销售经理' | '金融专员';
  dueWindow: string;
  expectedSignal: string;
}

export interface StrategyCardProps {
  title: string;
  summary: string;
  primaryBlocker: '价格' | '竞品' | '决策人' | '金融' | '置换' | '现车' | '信任' | '时间' | '无' | '未知';
  blockerReason: string;
  talkTracks: StrategyTalkTrack[];
  actionPlan: StrategyActionStep[];
  isStreaming?: boolean;
}

/**
 * 渲染策略卡片
 */
export function StrategyCard(props: StrategyCardProps) {
  const priorityColor = 
    props.primaryBlocker === '价格' ? '#b91c1c' :
    props.primaryBlocker === '竞品' ? '#b45309' :
    props.primaryBlocker === '决策人' ? '#7c3aed' :
    '#475569';
  
  return (
    <article className="strategy-card" style={{
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      background: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      {/* Header */}
      <header style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '24px', color: '#0f172a', fontWeight: 600 }}>
          {props.title}
        </h3>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
          {props.summary}
        </p>
      </header>
      
      {/* Primary Blocker */}
      <section style={{ 
        marginBottom: '20px', 
        padding: '12px', 
        background: '#fef2f2',
        borderRadius: '8px',
        borderLeft: `4px solid ${priorityColor}`,
      }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: priorityColor }}>
          🎯 核心阻碍: {props.primaryBlocker}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#475569' }}>
          {props.blockerReason}
        </p>
      </section>
      
      {/* Talk-tracks */}
      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '18px', color: '#0f172a', fontWeight: 600 }}>
          💬 话术建议
        </h4>
        {props.talkTracks.map((track, index) => (
          <div 
            key={`track-${index}`} 
            style={{ 
              marginBottom: '12px', 
              padding: '12px', 
              background: '#f8fafc', 
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
              {track.objective}
            </p>
            <p style={{ margin: '8px 0', color: '#334155', fontSize: '14px', lineHeight: 1.6 }}>
              {track.script}
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
              <span>🎯 语气: {track.tone}</span>
              <span>⏰ 时机: {track.whenToUse}</span>
            </div>
          </div>
        ))}
      </section>
      
      {/* Action Plan */}
      <section>
        <h4 style={{ margin: '0 0 12px', fontSize: '18px', color: '#0f172a', fontWeight: 600 }}>
          📋 行动计划
        </h4>
        {props.actionPlan.map((step, index) => (
          <div 
            key={`action-${index}`}
            style={{ 
              marginBottom: '10px', 
              padding: '12px', 
              background: '#f8fafc', 
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p style={{ margin: 0, color: '#1e293b', fontSize: '15px' }}>
              <span style={{ fontWeight: 600, marginRight: '8px' }}>{index + 1}.</span>
              {step.step}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
              <span>👤 {step.owner}</span>
              <span>⏱️ {step.dueWindow}</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#059669' }}>
              ✓ 成功信号: {step.expectedSignal}
            </p>
          </div>
        ))}
      </section>
      
      {/* Streaming Indicator */}
      {props.isStreaming && (
        <div style={{ marginTop: '12px', color: '#64748b', fontSize: '13px' }}>
          <span style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
            ⏳ 生成中...
          </span>
        </div>
      )}
    </article>
  );
}
