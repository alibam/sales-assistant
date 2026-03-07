/**
 * Model Capabilities - 模型能力定义
 * 
 * 描述不同模型的能力特征，用于任务路由和降级策略
 */

export type TaskType = 'gap-analysis' | 'strategy-generation' | 'fallback';

export interface ModelCapabilities {
  /** Provider 标识 */
  provider: string;
  
  /** 模型名称 */
  modelName: string;
  
  /** 是否支持 reasoning/thinking 模式 */
  supportsReasoning: boolean;
  
  /** 是否支持流式输出 */
  supportsStreaming: boolean;
  
  /** 是否支持结构化对象生成 */
  supportsStructuredObject: boolean;
  
  /** 推荐用于哪些任务 */
  preferredTasks: TaskType[];
  
  /** 已知问题 */
  knownIssues: string[];
  
  /** API 配置 */
  apiConfig: {
    baseURL: string;
    apiKey: string;
  };
}

/**
 * 模型能力注册表
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'self-hosted-qwen3-80b-a3b': {
    provider: 'vftllm',
    modelName: 'VFT-Qwen3-NEXT-80B-A3B',
    supportsReasoning: false,
    supportsStreaming: true,
    supportsStructuredObject: true,
    preferredTasks: ['gap-analysis'],
    knownIssues: [
      '返回空文本（finishReason: stop, textLength: 0）',
      '不支持 <think> 标签',
    ],
    apiConfig: {
      baseURL: 'https://vftllm.vf-tech.cn/v1',
      apiKey: process.env.VFT_API_KEY || '',
    },
  },

  'aliyun-qwen3.5-plus': {
    provider: 'aliyun',
    modelName: 'qwen3.5-plus',
    supportsReasoning: true,
    supportsStreaming: true,
    supportsStructuredObject: true,
    preferredTasks: ['strategy-generation'],
    knownIssues: [
      '返回值可能包含多余空格（如 "1 周" 而非 "1周"）',
      'reasoning_content 字段包含思考过程',
    ],
    apiConfig: {
      baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
      apiKey: process.env.ALIYUN_API_KEY || '',
    },
  },

  'minimax-2.5': {
    provider: 'minimax',
    modelName: 'MiniMax-M2.5',
    supportsReasoning: false,
    supportsStreaming: false,
    supportsStructuredObject: true,
    preferredTasks: [],
    knownIssues: [
      '不支持流式输出',
      '实验性模型，不推荐用于生产',
    ],
    apiConfig: {
      baseURL: 'https://api.minimaxi.com/v1',
      apiKey: process.env.MINIMAX_API_KEY || '',
    },
  },
};

/**
 * 获取模型能力
 */
export function getModelCapabilities(modelId: string): ModelCapabilities | undefined {
  return MODEL_CAPABILITIES[modelId];
}

/**
 * 根据任务类型获取推荐模型
 */
export function getRecommendedModel(taskType: TaskType): string | undefined {
  for (const [modelId, capabilities] of Object.entries(MODEL_CAPABILITIES)) {
    if (capabilities.preferredTasks.includes(taskType)) {
      return modelId;
    }
  }
  return undefined;
}

/**
 * 获取备用模型列表
 */
export function getFallbackModels(taskType: TaskType, excludeModel?: string): string[] {
  return Object.entries(MODEL_CAPABILITIES)
    .filter(([modelId, capabilities]) => {
      // 排除指定模型
      if (modelId === excludeModel) return false;
      
      // 必须支持结构化对象生成
      if (!capabilities.supportsStructuredObject) return false;
      
      // gap-analysis 需要非思考模型
      if (taskType === 'gap-analysis' && capabilities.supportsReasoning) return false;
      
      // strategy-generation 优先思考模型
      if (taskType === 'strategy-generation' && !capabilities.supportsReasoning) return false;
      
      return true;
    })
    .map(([modelId]) => modelId);
}
