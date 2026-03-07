/**
 * AI Provider Configuration
 * 
 * Centralized, environment-driven AI provider setup using @ai-sdk/openai.
 * 
 * 注意：此文件已逐渐被 task-executor.ts 替代
 * - gap-analysis 使用 task-executor（通过 model-registry）
 * - strategy-generation 仍使用此文件（需要 streaming 支持）
 */
import { getModel } from './model-registry';

/**
 * Get AI model for strategy generation (streaming support)
 * 
 * 此函数保留用于需要 streaming 支持的场景（如 strategy-server.ts）
 * 其他场景建议使用 task-executor.ts
 * 
 * @returns Model instance for Vercel AI SDK
 */
export function getAIModel() {
  // 默认使用 aliyun-qwen3.5-plus（支持 streaming 和 reasoning）
  // 策略生成任务使用此模型
  return getModel('aliyun-qwen3.5-plus');
}

/**
 * 兼容旧接口（已废弃，使用 getAIModel 代替）
 * @deprecated 请使用 getAIModel()
 */
export function getLegacyModel() {
  const modelName = process.env.AI_MODEL_NAME || 'qwen3.5-plus';
  return getModel(modelName);
}

/**
 * Clear the cached provider instance (useful for testing).
 */
export function clearProviderCache(): void {
  // model-registry 内部有自己的缓存清理
  // 此函数保留作为兼容接口
}
