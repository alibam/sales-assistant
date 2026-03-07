/**
 * Task Executor - 统一任务执行器
 * 
 * 封装模型调用、schema 校验、异常处理、降级策略、评估日志
 */

import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from './model-registry';
import { getModelCapabilities, type TaskType } from './model-capabilities';
import { routeTask } from './task-router';

/**
 * 模型评估日志
 */
export interface ModelEvaluationLog {
  /** 任务类型 */
  taskType: TaskType;
  
  /** 使用的模型 */
  model: string;
  
  /** 模型角色 */
  role?: string;
  
  /** 是否使用 reasoning 模式 */
  reasoning: boolean;
  
  /** 是否成功 */
  success: boolean;
  
  /** 错误类型（如果失败） */
  errorType?: 'schema' | 'provider' | 'timeout' | 'unsupported';
  
  /** 延迟（毫秒） */
  latency: number;
  
  /** 是否有领域违规 */
  domainViolation: boolean;
  
  /** 来源 */
  source: 'primary' | 'fallback' | 'shadow';
  
  /** 时间戳 */
  timestamp: number;
}

/**
 * 记录模型评估日志
 */
function logModelEvaluation(log: ModelEvaluationLog): void {
  console.log('[Model Evaluation]', JSON.stringify(log, null, 2));
  
  // TODO: 后续可以将日志发送到监控系统
  // 例如：发送到 Prometheus、DataDog、或自建日志系统
}

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
  
  console.log(`[Task Executor] Task: ${taskType}, Primary Model: ${routing.primaryModel}, Role: ${routing.role}`);

  const startTime = Date.now();

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

    const latency = Date.now() - startTime;

    console.log(`[Task Executor] Success with primary model: ${routing.primaryModel}`);

    // 记录评估日志
    logModelEvaluation({
      taskType,
      model: routing.primaryModel,
      role: routing.role,
      reasoning: capabilities.supportsReasoning,
      success: true,
      latency,
      domainViolation: false, // TODO: 需要实际检测
      source: 'primary',
      timestamp: Date.now(),
    });

    return {
      ok: true,
      data: result.text,
      source: 'primary',
      model: routing.primaryModel,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const capabilities = getModelCapabilities(routing.primaryModel);
    
    console.error(`[Task Executor] Primary model failed:`, error);

    // 记录失败日志
    logModelEvaluation({
      taskType,
      model: routing.primaryModel,
      role: routing.role,
      reasoning: capabilities?.supportsReasoning || false,
      success: false,
      errorType: 'provider',
      latency,
      domainViolation: false,
      source: 'primary',
      timestamp: Date.now(),
    });

    // 如果启用降级且有备用模型，尝试降级
    if (enableFallback && routing.fallbackModels.length > 0) {
      console.log(`[Task Executor] Trying fallback models:`, routing.fallbackModels);

      for (const fallbackModelId of routing.fallbackModels) {
        const fallbackStartTime = Date.now();
        
        try {
          const model = getModel(fallbackModelId);
          const result = await generateText({
            model,
            prompt,
            ...(timeoutMs && { abortSignal: AbortSignal.timeout(timeoutMs) }),
          });

          if (result.text && result.text.length > 0) {
            const fallbackLatency = Date.now() - fallbackStartTime;
            const fallbackCapabilities = getModelCapabilities(fallbackModelId);
            
            console.log(`[Task Executor] Success with fallback model: ${fallbackModelId}`);

            // 记录降级成功日志
            logModelEvaluation({
              taskType,
              model: fallbackModelId,
              reasoning: fallbackCapabilities?.supportsReasoning || false,
              success: true,
              latency: fallbackLatency,
              domainViolation: false,
              source: 'fallback',
              timestamp: Date.now(),
            });

            return {
              ok: true,
              data: result.text,
              source: 'fallback',
              model: fallbackModelId,
            };
          }
        } catch (fallbackError) {
          const fallbackLatency = Date.now() - fallbackStartTime;
          const fallbackCapabilities = getModelCapabilities(fallbackModelId);
          
          console.error(`[Task Executor] Fallback model ${fallbackModelId} failed:`, fallbackError);
          
          // 记录降级失败日志
          logModelEvaluation({
            taskType,
            model: fallbackModelId,
            reasoning: fallbackCapabilities?.supportsReasoning || false,
            success: false,
            errorType: 'provider',
            latency: fallbackLatency,
            domainViolation: false,
            source: 'fallback',
            timestamp: Date.now(),
          });
          
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
