/**
 * 测试：模型适配层
 * 
 * 验证任务路由、模型选择、降级策略
 */

import { describe, it, expect } from 'vitest';
import { getRecommendedModel, getFallbackModels, MODEL_CAPABILITIES } from '../../lib/ai/model-capabilities';
import { routeTask } from '../../lib/ai/task-router';

describe('模型适配层测试', () => {
  describe('任务路由', () => {
    it('gap-analysis 应该选择非思考模型', () => {
      const model = getRecommendedModel('gap-analysis');
      expect(model).toBe('self-hosted-qwen3-80b-a3b');
    });

    it('strategy-generation 应该选择思考模型', () => {
      const model = getRecommendedModel('strategy-generation');
      expect(model).toBe('aliyun-qwen3.5-plus');
    });

    it('fallback 任务应该没有推荐模型', () => {
      const model = getRecommendedModel('fallback');
      expect(model).toBeUndefined();
    });
  });

  describe('降级策略', () => {
    it('gap-analysis 的备用模型不应包含思考模型', () => {
      const fallbacks = getFallbackModels('gap-analysis', 'self-hosted-qwen3-80b-a3b');
      
      // 备用模型不应包含 aliyun-qwen3.5-plus（思考模型）
      expect(fallbacks).not.toContain('aliyun-qwen3.5-plus');
    });

    it('strategy-generation 的备用模型应优先思考模型', () => {
      const fallbacks = getFallbackModels('strategy-generation', 'aliyun-qwen3.5-plus');
      
      // 如果有备用模型，应该是支持思考的
      // 当前配置下，只有 aliyun-qwen3.5-plus 支持思考，所以备用列表应该为空
      expect(fallbacks.length).toBe(0);
    });

    it('应该排除指定的模型', () => {
      const fallbacks = getFallbackModels('gap-analysis', 'self-hosted-qwen3-80b-a3b');
      expect(fallbacks).not.toContain('self-hosted-qwen3-80b-a3b');
    });
  });

  describe('任务路由器', () => {
    it('应该返回主模型和备用模型', () => {
      const result = routeTask({ taskType: 'gap-analysis' });
      
      expect(result.primaryModel).toBe('self-hosted-qwen3-80b-a3b');
      expect(Array.isArray(result.fallbackModels)).toBe(true);
    });

    it('应该支持强制指定模型', () => {
      const result = routeTask({
        taskType: 'gap-analysis',
        forceModel: 'aliyun-qwen3.5-plus',
      });
      
      expect(result.primaryModel).toBe('aliyun-qwen3.5-plus');
    });

    it('应该支持禁用降级策略', () => {
      const result = routeTask({
        taskType: 'gap-analysis',
        enableFallback: false,
      });
      
      expect(result.fallbackModels.length).toBe(0);
    });
  });

  describe('模型能力', () => {
    it('self-hosted-qwen3-80b-a3b 不应支持思考模式', () => {
      const model = getRecommendedModel('gap-analysis');
      expect(model).toBe('self-hosted-qwen3-80b-a3b');
      
      // 验证该模型不支持思考
      const capabilities = MODEL_CAPABILITIES['self-hosted-qwen3-80b-a3b'];
      expect(capabilities.supportsReasoning).toBe(false);
    });

    it('aliyun-qwen3.5-plus 应支持思考模式', () => {
      const model = getRecommendedModel('strategy-generation');
      expect(model).toBe('aliyun-qwen3.5-plus');
      
      // 验证该模型支持思考
      const capabilities = MODEL_CAPABILITIES['aliyun-qwen3.5-plus'];
      expect(capabilities.supportsReasoning).toBe(true);
    });

    it('minimax-2.5 不应被推荐用于任何任务', () => {
      const capabilities = MODEL_CAPABILITIES['minimax-2.5'];
      expect(capabilities.preferredTasks.length).toBe(0);
    });
  });
});
