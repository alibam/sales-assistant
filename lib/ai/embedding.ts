/**
 * Embedding API - 对接 Qwen3-Embedding 端点
 * 负责调用私有化部署的 Qwen3-Embedding API 获取文本向量
 */

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * 调用 Qwen3-Embedding API 获取文本向量
 *
 * @param text - 输入文本
 * @returns 1024 维向量数组
 * @throws Error 当 API 调用失败或返回数据不符合预期时
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiUrl = process.env.EMBEDDING_API_URL;
  const apiKey = process.env.EMBEDDING_API_KEY;
  const model = process.env.EMBEDDING_MODEL || 'qwen3-embedding';

  // 验证环境变量
  if (!apiUrl) {
    throw new Error('EMBEDDING_API_URL 环境变量未配置');
  }

  if (!apiKey) {
    throw new Error('EMBEDDING_API_KEY 环境变量未配置');
  }

  // 验证输入
  if (!text || text.trim().length === 0) {
    throw new Error('输入文本不能为空');
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Embedding API 调用失败 (${response.status}): ${errorText}`
      );
    }

    const data: EmbeddingResponse = await response.json();

    // 验证返回数据结构
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Embedding API 返回数据格式错误：缺少 data 数组');
    }

    const embedding = data.data[0].embedding;

    // 验证向量维度
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding API 返回的向量不是数组');
    }

    if (embedding.length !== 1024) {
      throw new Error(
        `Embedding 向量维度错误：期望 1024，实际 ${embedding.length}`
      );
    }

    // 验证向量元素都是数字
    if (!embedding.every(v => typeof v === 'number' && !isNaN(v))) {
      throw new Error('Embedding 向量包含非数字元素');
    }

    return embedding;
  } catch (error) {
    // 重新抛出错误，保留原始错误信息
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Embedding API 调用失败: ${String(error)}`);
  }
}

/**
 * 批量获取文本向量（带重试逻辑）
 *
 * @param texts - 文本数组
 * @param options - 选项
 * @returns 向量数组
 */
export async function getEmbeddings(
  texts: string[],
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  }
): Promise<number[][]> {
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;

  const embeddings: number[][] = [];

  for (const text of texts) {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const embedding = await getEmbedding(text);
        embeddings.push(embedding);
        lastError = null;
        break;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (lastError) {
      throw new Error(
        `批量获取 Embedding 失败（已重试 ${maxRetries} 次）: ${lastError.message}`
      );
    }
  }

  return embeddings;
}
