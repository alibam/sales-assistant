'use server';

import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { chunkText } from '@/lib/ai/document-processor';
import { getEmbedding } from '@/lib/ai/embedding';

export interface UploadDocumentResult {
  success: boolean;
  message: string;
  kbId?: string;
  chunksCount?: number;
}

/**
 * 上传并向量化文档
 *
 * 流水线：
 * 1. 验证用户身份，获取 tenantId
 * 2. 在 KnowledgeBase 表创建记录
 * 3. 切分文本为多个块
 * 4. 为每个块调用 Embedding API
 * 5. 将块和向量存入 DocumentChunk 表
 *
 * @param title - 文档标题
 * @param content - 文档内容（纯文本）
 * @returns 成功消息或错误
 */
export async function uploadDocument(
  title: string,
  content: string
): Promise<UploadDocumentResult> {
  try {
    // 1. 验证身份
    const session = await requireAuth();

    // 验证输入
    if (!title || title.trim().length === 0) {
      return {
        success: false,
        message: '文档标题不能为空',
      };
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        message: '文档内容不能为空',
      };
    }

    // 2. 创建知识库记录
    const kb = await prisma.knowledgeBase.create({
      data: {
        tenantId: session.tenantId,
        name: title,
        description: `上传于 ${new Date().toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
        })}`,
      },
    });

    // 3. 切分文本
    const chunks = chunkText(content, {
      maxChunkSize: 500,
      overlap: 50,
    });

    if (chunks.length === 0) {
      // 如果没有生成任何块，删除知识库记录
      await prisma.knowledgeBase.delete({
        where: { id: kb.id },
      });

      return {
        success: false,
        message: '文档内容无法切分，请检查内容格式',
      };
    }

    // 4-5. 批量向量化并入库（使用事务确保原子性）
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
          // 获取向量
          const embedding = await getEmbedding(chunk);

          // 插入 DocumentChunk（使用 $executeRaw 处理 vector 类型）
          await tx.$executeRaw`
            INSERT INTO document_chunks (
              id, tenant_id, knowledge_base_id, content, embedding, created_at, updated_at
            ) VALUES (
              gen_random_uuid(),
              ${session.tenantId}::uuid,
              ${kb.id}::uuid,
              ${chunk},
              ${embedding}::vector(1024),
              NOW(),
              NOW()
            )
          `;
        } catch (error) {
          // 向量化失败时，抛出错误以触发事务回滚
          throw new Error(
            `第 ${i + 1} 个文本块向量化失败: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    });

    return {
      success: true,
      message: `成功上传文档「${title}」，共 ${chunks.length} 个文本块`,
      kbId: kb.id,
      chunksCount: chunks.length,
    };
  } catch (error) {
    console.error('[Upload Document] Error:', error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '上传失败，请稍后重试',
    };
  }
}

/**
 * 获取租户的知识库列表
 */
export async function getKnowledgeBases() {
  try {
    const session = await requireAuth();

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: {
        tenantId: session.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    return {
      success: true,
      data: knowledgeBases,
    };
  } catch (error) {
    console.error('[Get Knowledge Bases] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取知识库列表失败',
      data: [],
    };
  }
}
