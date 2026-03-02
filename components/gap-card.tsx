/**
 * Gap Card Component
 * 
 * 展示客户画像中的缺失信息和追问建议。
 */

export interface GapCardProps {
  sectionTitle: string;
  field: string;
  description: string;
  priority: 'critical' | 'high' | 'normal';
  suggestedQuestion: string;
  whyImportant: string;
  isStreaming?: boolean;
}

/**
 * 渲染缺口追问卡片
 */
export function GapCard(props: GapCardProps) {
  const priorityConfig = {
    critical: { color: '#dc2626', bg: '#fef2f2', label: '🔴 关键缺失' },
    high: { color: '#d97706', bg: '#fffbeb', label: '🟡 高优先级' },
    normal: { color: '#2563eb', bg: '#eff6ff', label: '🔵 建议补充' },
  };
  
  const config = priorityConfig[props.priority];
  
  return (
    <article 
      className="gap-card"
      style={{
        border: `1px solid ${config.color}`,
        borderRadius: '12px',
        padding: '16px',
        background: config.bg,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
          {props.sectionTitle} · {props.field}
        </p>
        <span style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          color: config.color,
          padding: '4px 8px',
          background: 'white',
          borderRadius: '4px',
        }}>
          {config.label}
        </span>
      </div>
      
      {/* Description */}
      <p style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '14px', lineHeight: 1.5 }}>
        {props.description}
      </p>
      
      {/* Suggested Question */}
      <div style={{ 
        padding: '12px', 
        background: 'white', 
        borderRadius: '8px',
        marginBottom: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
          💡 建议追问:
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
          "{props.suggestedQuestion}"
        </p>
      </div>
      
      {/* Why Important */}
      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
        <span style={{ fontWeight: 600 }}>为什么重要:</span> {props.whyImportant}
      </p>
      
      {/* Streaming Indicator */}
      {props.isStreaming && (
        <div style={{ marginTop: '8px', color: '#64748b', fontSize: '12px' }}>
          ⏳ 生成中...
        </div>
      )}
    </article>
  );
}

/**
 * Gap Card List Component
 * 
 * 展示多个缺口追问卡片
 */
export interface GapCardListProps {
  gaps: Array<{
    section: string;
    sectionTitle: string;
    field: string;
    description: string;
    priority: 'critical' | 'high' | 'normal';
    suggestedQuestion?: string;
    whyImportant?: string;
  }>;
  isStreaming?: boolean;
}

export function GapCardList(props: GapCardListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {props.gaps.map((gap, index) => (
        <GapCard
          key={`gap-${index}`}
          sectionTitle={gap.sectionTitle}
          field={gap.field}
          description={gap.description}
          priority={gap.priority}
          suggestedQuestion={gap.suggestedQuestion || `请问关于${gap.field}的情况是？`}
          whyImportant={gap.whyImportant || '这个信息有助于更准确地评估客户需求'}
          isStreaming={props.isStreaming}
        />
      ))}
    </div>
  );
}
