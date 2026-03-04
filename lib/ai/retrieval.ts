/**
 * 向量检索服务 - 从知识库中检索相关内容
 * 实现 RAG (Retrieval-Augmented Generation) 的检索层
 */

import { getEmbedding } from './embedding';
import { prisma } from '@/lib/db/client';

export interface RetrievalResult {
  content: string;
  similarity: number;
}

interface QueryResult {
  content: string;
  distance: number;
}

/**
 * 向量检索服务 - 从知识库中检索相关内容
 *
 * @param query - 查询文本（如："BMW X5 竞品对比"）
 * @param tenantId - 租户 ID（必须，用于数据隔离）
 * @param limit - 返回结果数量（默认 3）
 * @returns 相似度最高的文档片段数组
 */
export async function searchRelevantKnowledge(
  query: string,
  tenantId: string,
  limit: number = 3
): Promise<RetrievalResult[]> {
  // 验证输入
  if (!query || query.trim().length === 0) {
    throw new Error('查询文本不能为空');
  }

  if (!tenantId) {
    throw new Error('租户 ID 不能为空');
  }

  if (limit <= 0 || limit > 100) {
    throw new Error('limit 必须在 1-100 之间');
  }

  try {
    // 1. 调用 embedding.ts 将 query 转化为 1024 维向量
    const queryEmbedding = await getEmbedding(query);

    // 2. 使用 Prisma $queryRaw 执行向量余弦相似度查询
    // 注意：
    // - 表名：document_chunks（蛇形命名）
    // - 字段名：tenant_id, content, embedding（蛇形命名）
    // - 向量操作符：<=> (余弦距离，越小越相似)
    // - 绝对红线：必须包含 tenant_id = ${tenantId} 过滤

    const results = await prisma.$queryRaw<QueryResult[]>`
      SELECT
        content,
        embedding <=> CAST(${JSON.stringify(queryEmbedding)} AS vector) AS distance
      FROM document_chunks
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    // 3. 转换为相似度（1 - distance）
    return results.map((r: QueryResult) => ({
      content: r.content,
      similarity: 1 - r.distance,
    }));
  } catch (error) {
    // 提供更详细的错误信息
    if (error instanceof Error) {
      throw new Error(`向量检索失败: ${error.message}`);
    }
    throw new Error(`向量检索失败: ${String(error)}`);
  }
}
