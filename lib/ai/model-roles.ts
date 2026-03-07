/**
 * Model Roles - 模型角色定义
 * 
 * 将逻辑角色与物理模型解耦，支持灵活的模型切换
 */

/**
 * 模型角色类型
 * 
 * 逻辑角色不绑定具体模型，便于后续升级和切换
 */
export type ModelRole =
  | 'self_hosted_fast_extract'        // 自部署快速提取模型（用于 gap-analysis）
  | 'cloud_reasoning_primary'         // 云端主力推理模型（用于 strategy-generation）
  | 'self_hosted_reasoning_candidate' // 自部署推理候选模型（用于 shadow 对比）
  | 'local_fallback'                  // 本地降级模型
  | 'experimental';                   // 实验性模型

/**
 * 模型角色到物理模型的映射
 * 
 * 这是唯一需要修改的地方，当升级模型时只需修改此映射
 */
export const MODEL_ROLE_MAPPING: Record<ModelRole, string> = {
  // 自部署快速提取：当前使用 Qwen3-80B-A3B，未来可升级为 Qwen3.5-122B-A10B
  'self_hosted_fast_extract': 'self-hosted-qwen3-80b-a3b',
  
  // 云端主力推理：当前使用阿里云 Qwen3.5-plus
  'cloud_reasoning_primary': 'aliyun-qwen3.5-plus',
  
  // 自部署推理候选：预留给未来的 Qwen3.5-122B-A10B
  'self_hosted_reasoning_candidate': 'self-hosted-qwen3-80b-a3b', // 暂时映射到现有模型
  
  // 本地降级：使用自部署模型
  'local_fallback': 'self-hosted-qwen3-80b-a3b',
  
  // 实验性：Minimax
  'experimental': 'minimax-2.5',
};

/**
 * 任务类型到模型角色的映射
 * 
 * 定义每个任务应该使用什么角色的模型
 */
export const TASK_ROLE_MAPPING: Record<string, ModelRole> = {
  'gap-analysis': 'self_hosted_fast_extract',
  'strategy-generation': 'cloud_reasoning_primary',
  'fallback': 'local_fallback',
};

/**
 * 获取任务对应的模型角色
 */
export function getTaskRole(taskType: string): ModelRole {
  return TASK_ROLE_MAPPING[taskType] || 'local_fallback';
}

/**
 * 获取角色对应的物理模型 ID
 */
export function getRoleModel(role: ModelRole): string {
  return MODEL_ROLE_MAPPING[role];
}

/**
 * 获取任务对应的物理模型 ID（通过角色映射）
 */
export function getTaskModel(taskType: string): string {
  const role = getTaskRole(taskType);
  return getRoleModel(role);
}
