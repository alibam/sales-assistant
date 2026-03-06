'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ReasoningBlockProps {
  content: string;
  className?: string;
}

/**
 * ReasoningBlock - 高健壮性的思维解析组件
 * 
 * 用于渲染带有 <think> 标签的文本，支持：
 * - Emoji 前缀（🔍、💬 等）
 * - 思考过程折叠/展开
 * - 自动收起机制
 * - 流式渲染支持
 */
export function ReasoningBlock({ content, className = '' }: ReasoningBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [parsed, setParsed] = useState<{
    prefix: string;
    thinking: string;
    final: string;
    hasThinking: boolean;
    isComplete: boolean;
  }>({
    prefix: '',
    thinking: '',
    final: '',
    hasThinking: false,
    isComplete: false,
  });

  useEffect(() => {
    // 增强解析正则：支持 Emoji 前缀
    // 匹配模式：(前缀)<think>(思考过程)</think>(最终正文)
    const regex = /(.*?)<think>([\s\S]*?)<\/think>(.*)/s;
    const match = content.match(regex);

    if (match) {
      const [, prefix, thinking, final] = match;
      const isComplete = content.includes('</think>');
      
      setParsed({
        prefix: prefix.trim(),
        thinking: thinking.trim(),
        final: final.trim(),
        hasThinking: true,
        isComplete,
      });

      // 自动收起机制：当检测到 </think> 且开始输出最终正文时，自动收起
      if (isComplete && final.trim()) {
        setIsOpen(false);
      }
    } else if (content.includes('<think>')) {
      // 正在思考中，还没有 </think>
      const thinkStart = content.indexOf('<think>');
      const prefix = content.substring(0, thinkStart).trim();
      const thinking = content.substring(thinkStart + 7).trim(); // 7 = '<think>'.length

      setParsed({
        prefix,
        thinking,
        final: '',
        hasThinking: true,
        isComplete: false,
      });
    } else {
      // 没有 <think> 标签，直接渲染
      setParsed({
        prefix: '',
        thinking: '',
        final: content,
        hasThinking: false,
        isComplete: true,
      });
    }
  }, [content]);

  // 如果没有思考过程，直接渲染内容
  if (!parsed.hasThinking) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={className}>
      {/* 前缀文本（如 🔍、💬 等） */}
      {parsed.prefix && (
        <div className="mb-2">
          {parsed.prefix}
        </div>
      )}

      {/* 思考过程折叠面板 */}
      <details 
        open={isOpen} 
        onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
        className="mb-2 border border-slate-200 rounded-lg overflow-hidden"
      >
        <summary className="cursor-pointer px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-2 text-sm font-medium text-slate-700">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {parsed.isComplete ? '💡 思考完成' : '🧠 深度思考中...'}
        </summary>
        <div className="px-3 py-2 bg-white text-xs text-slate-600 whitespace-pre-wrap">
          {parsed.thinking}
        </div>
      </details>

      {/* 最终正文 */}
      {parsed.final && (
        <div className="whitespace-pre-wrap">
          {parsed.final}
        </div>
      )}
    </div>
  );
}
