/**
 * Model Registry - 模型注册表
 * 
 * 管理模型实例的创建和缓存
 */

import { createOpenAI } from '@ai-sdk/openai';
import { MODEL_CAPABILITIES, type ModelCapabilities } from './model-capabilities';

type ModelInstance = ReturnType<typeof createOpenAI>;

/**
 * 模型实例缓存
 */
const modelInstanceCache = new Map<string, ModelInstance>();

/**
 * 创建模型实例
 */
function createModelInstance(capabilities: ModelCapabilities): ModelInstance {
  return createOpenAI({
    baseURL: capabilities.apiConfig.baseURL,
    apiKey: capabilities.apiConfig.apiKey,
    compatibility: 'compatible',
  });
}

/**
 * 获取模型实例
 * 
 * @param modelId - 模型 ID（如 'aliyun-qwen3.5-plus'）
 * @returns 模型实例
 */
export function getModelInstance(modelId: string): ModelInstance {
  // 检查缓存
  if (modelInstanceCache.has(modelId)) {
    return modelInstanceCache.get(modelId)!;
  }

  // 获取模型能力
  const capabilities = MODEL_CAPABILITIES[modelId];
  if (!capabilities) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  // 创建实例
  const instance = createModelInstance(capabilities);
  
  // 缓存
  modelInstanceCache.set(modelId, instance);
  
  return instance;
}

/**
 * 获取模型对象（用于 Vercel AI SDK）
 * 
 * @param modelId - 模型 ID
 * @returns 模型对象
 */
export function getModel(modelId: string) {
  const capabilities = MODEL_CAPABILITIES[modelId];
  if (!capabilities) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const instance = getModelInstance(modelId);
  return instance(capabilities.modelName);
}

/**
 * 清除模型实例缓存
 */
export function clearModelCache(): void {
  modelInstanceCache.clear();
}
