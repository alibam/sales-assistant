/**
 * Task Router - 任务路由器
 * 
 * 根据任务类型选择合适的模型
 */

import { getRecommendedModel, getFallbackModels, type TaskType } from './model-capabilities';

export interface TaskRoutingConfig {
  /** 任务类型 */
  taskType: TaskType;
  
  /** 是否启用降级策略 */
  enableFallback?: boolean;
  
  /** 强制使用指定模型 */
  forceModel?: string;
}

export interface TaskRoutingResult {
  /** 主模型 */
  primaryModel: string;
  
  /** 备用模型列表 */
  fallbackModels: string[];
}

/**
 * 路由任务到合适的模型
 * 
 * @param config - 路由配置
 * @returns 路由结果
 */
export function routeTask(config: TaskRoutingConfig): TaskRoutingResult {
  const { taskType, enableFallback = true, forceModel } = config;

  // 如果强制指定模型，直接使用
  if (forceModel) {
    return {
      primaryModel: forceModel,
      fallbackModels: enableFallback ? getFallbackModels(taskType, forceModel) : [],
    };
  }

  // 获取推荐模型
  const primaryModel = getRecommendedModel(taskType);
  if (!primaryModel) {
    throw new Error(`No recommended model for task: ${taskType}`);
  }

  // 获取备用模型
  const fallbackModels = enableFallback ? getFallbackModels(taskType, primaryModel) : [];

  return {
    primaryModel,
    fallbackModels,
  };
}
