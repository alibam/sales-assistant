/**
 * Task Router - 任务路由器
 * 
 * 根据任务类型选择合适的模型（通过角色映射）
 */

import { getRecommendedModel, getFallbackModels, type TaskType } from './model-capabilities';
import { getTaskModel, getTaskRole } from './model-roles';

export interface TaskRoutingConfig {
  /** 任务类型 */
  taskType: TaskType;
  
  /** 是否启用降级策略 */
  enableFallback?: boolean;
  
  /** 强制使用指定模型 */
  forceModel?: string;
  
  /** 是否启用 shadow 模式 */
  enableShadow?: boolean;
  
  /** Shadow 模型角色 */
  shadowRole?: string;
}

export interface TaskRoutingResult {
  /** 主模型 */
  primaryModel: string;
  
  /** 备用模型列表 */
  fallbackModels: string[];
  
  /** Shadow 模型（如果启用） */
  shadowModel?: string;
  
  /** 模型角色 */
  role?: string;
}

/**
 * 路由任务到合适的模型
 * 
 * @param config - 路由配置
 * @returns 路由结果
 */
export function routeTask(config: TaskRoutingConfig): TaskRoutingResult {
  const { taskType, enableFallback = true, forceModel, enableShadow = false, shadowRole } = config;

  // 如果强制指定模型，直接使用
  if (forceModel) {
    return {
      primaryModel: forceModel,
      fallbackModels: enableFallback ? getFallbackModels(taskType, forceModel) : [],
      shadowModel: enableShadow && shadowRole ? getTaskModel(shadowRole) : undefined,
    };
  }

  // 通过角色映射获取推荐模型
  const role = getTaskRole(taskType);
  const primaryModel = getTaskModel(taskType);
  
  if (!primaryModel) {
    throw new Error(`No model found for task: ${taskType}`);
  }

  // 获取备用模型
  const fallbackModels = enableFallback ? getFallbackModels(taskType, primaryModel) : [];

  // Shadow 模型
  const shadowModel = enableShadow && shadowRole ? getTaskModel(shadowRole) : undefined;

  return {
    primaryModel,
    fallbackModels,
    shadowModel,
    role,
  };
}
