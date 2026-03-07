/**
 * Task Executor - 统一任务执行器
 * 
 * 封装模型调用、schema 校验、异常处理、降级策略
 */

import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from './model-registry';
import { getModelCapabilities, type TaskType } from './model-capabilities';
import { routeTask } from './task-router';

/**
 * 统一返回协议
 */
export type AiTaskResult<T> =
  | {
      ok: true;
      data: T;
      source: 'primary' | 'fallback';
      model: string;
    }
  | {
      ok: false;
      errorType: 'schema' | 'provider' | 'timeout' | 'unsupported';
      message: string;
      model: string;
    };

/**
 * 任务执行配置
 */
export interface TaskExecutionConfig<T> {
  /** 任务类型 */
  taskType: TaskType;
  
  /** Prompt */
  prompt: string;
  
  /** Schema（用于 generateObject） */
  schema?: z.ZodType<T>;
  
  /** 是否启用降级策略 */
  enableFallback?: boolean;
  
  /** 强制使用指定模型 */
  forceModel?: string;
  
  /** 超时时间（毫秒） */
  timeoutMs?: number;
}

/**
 * 执行文本生成任务
 */
export async function executeTextTask(
  config: TaskExecutionConfig<string>
): Promise<AiTaskResult<string>> {
  const { taskType, prompt, enableFallback = true, forceModel, timeoutMs } = config;

  // 路由任务
  const routing = routeTask({ taskType, enableFallback, forceModel });
  
  console.log(`[Task Executor] Task: ${taskType}, Primary Model: ${routing.primaryModel}`);

  // 尝试主模型
  try {
    const model = getModel(routing.primaryModel);
    const capabilities = getModelCapabilities(routing.primaryModel);

    if (!capabilities) {
      throw new Error(`Model capabilities not found: ${routing.primaryModel}`);
    }

    const result = await generateText({
      model,
      prompt,
      ...(timeoutMs && { abortSignal: AbortSignal.timeout(timeoutMs) }),
    });

    // 检查返回文本
    if (!result.text || result.text.length === 0) {
      throw new Error('Model returned empty text');
    }

    console.log(`[Task Executor] Success with primary model: ${routing.primaryModel}`);

    return {
      ok: true,
      data: result.text,
      source: 'primary',
      model: routing.primaryModel,
    };
  } catch (error) {
    console.error(`[Task Executor] Primary model failed:`, error);

    // 如果启用降级且有备用模型，尝试降级
    if (enableFallback && routing.fallbackModels.length > 0) {
      console.log(`[Task Executor] Trying fallback models:`, routing.fallbackModels);

      for (const fallbackModelId of routing.fallbackModels) {
        try {
          const model = getModel(fallbackModelId);
          const result = await generateText({
            model,
            prompt,
            ...(timeoutMs && { abortSignal: AbortSignal.timeout(timeoutMs) }),
          });

          if (result.text && result.text.length > 0) {
            console.log(`[Task Executor] Success with fallback model: ${fallbackModelId}`);

            return {
              ok: true,
              data: result.text,
              source: 'fallback',
              model: fallbackModelId,
            };
          }
        } catch (fallbackError) {
          console.error(`[Task Executor] Fallback model ${fallbackModelId} failed:`, fallbackError);
          continue;
        }
      }
    }

    // 所有模型都失败
    return {
      ok: false,
      errorType: 'provider',
      message: error instanceof Error ? error.message : String(error),
      model: routing.primaryModel,
    };
  }
}

/**
 * 执行结构化对象生成任务
 */
export async function executeObjectTask<T>(
  config: TaskExecutionConfig<T>
): Promise<AiTaskResult<T>> {
  const { taskType, prompt, schema, enableFallback = true, forceModel, timeoutMs } = config;

  if (!schema) {
    throw new Error('Schema is required for object generation task');
  }

  // 路由任务
  const routing = routeTask({ taskType, enableFallback, forceModel });
  
  console.log(`[Task Executor] Task: ${taskType}, Primary Model: ${routing.primaryModel}`);

  // 尝试主模型
  try {
    const model = getModel(routing.primaryModel);
    const capabilities = getModelCapabilities(routing.primaryModel);

    if (!capabilities) {
      throw new Error(`Model capabilities not found: ${routing.primaryModel}`);
    }

    if (!capabilities.supportsStructuredObject) {
      throw new Error(`Model does not support structured object generation: ${routing.primaryModel}`);
    }

    const result = await generateObject({
      model,
      prompt,
      schema,
      ...(timeoutMs && { abortSignal: AbortSignal.timeout(timeoutMs) }),
    });

    console.log(`[Task Executor] Success with primary model: ${routing.primaryModel}`);

    return {
      ok: true,
      data: result.object,
      source: 'primary',
      model: routing.primaryModel,
    };
  } catch (error) {
    console.error(`[Task Executor] Primary model failed:`, error);

    // 判断错误类型
    const errorType = error instanceof z.ZodError ? 'schema' : 'provider';

    // 如果是 schema 错误且启用降级，尝试备用模型
    if (enableFallback && routing.fallbackModels.length > 0) {
      console.log(`[Task Executor] Trying fallback models:`, routing.fallbackModels);

      for (const fallbackModelId of routing.fallbackModels) {
        try {
          const model = getModel(fallbackModelId);
          const capabilities = getModelCapabilities(fallbackModelId);

          if (!capabilities?.supportsStructuredObject) {
            continue;
          }

          const result = await generateObject({
            model,
            prompt,
            schema,
            ...(timeoutMs && { abortSignal: AbortSignal.timeout(timeoutMs) }),
          });

          console.log(`[Task Executor] Success with fallback model: ${fallbackModelId}`);

          return {
            ok: true,
            data: result.object,
            source: 'fallback',
            model: fallbackModelId,
          };
        } catch (fallbackError) {
          console.error(`[Task Executor] Fallback model ${fallbackModelId} failed:`, fallbackError);
          continue;
        }
      }
    }

    // 所有模型都失败
    return {
      ok: false,
      errorType,
      message: error instanceof Error ? error.message : String(error),
      model: routing.primaryModel,
    };
  }
}
