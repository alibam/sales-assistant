-- ============================================
-- RAG 向量化流水线验证 SQL
-- ============================================
-- 使用方法: 在 Prisma Studio 或 psql 中执行

-- 1. 检查知识库记录
-- 替换 <your-tenant-id> 为实际的 tenant_id
SELECT
  id,
  name,
  description,
  created_at,
  updated_at
FROM knowledge_bases
WHERE tenant_id = '<your-tenant-id>'
ORDER BY created_at DESC;

-- 2. 检查文档块记录（包含向量维度）
SELECT
  id,
  knowledge_base_id,
  LEFT(content, 50) as content_preview,
  array_length(embedding, 1) as vector_dimension,
  created_at
FROM document_chunks
WHERE tenant_id = '<your-tenant-id>'
ORDER BY created_at DESC;

-- 3. 统计每个知识库的文档块数量
SELECT
  kb.id,
  kb.name,
  COUNT(dc.id) as chunk_count,
  kb.created_at
FROM knowledge_bases kb
LEFT JOIN document_chunks dc ON dc.knowledge_base_id = kb.id
WHERE kb.tenant_id = '<your-tenant-id>'
GROUP BY kb.id, kb.name, kb.created_at
ORDER BY kb.created_at DESC;

-- 4. 验证向量维度（应该全部返回 1024）
SELECT DISTINCT array_length(embedding, 1) as vector_dimension
FROM document_chunks
WHERE tenant_id = '<your-tenant-id>';

-- 5. 查看最近上传的文档块（完整内容）
SELECT
  id,
  content,
  array_length(embedding, 1) as vector_dim,
  created_at
FROM document_chunks
WHERE tenant_id = '<your-tenant-id>'
ORDER BY created_at DESC
LIMIT 5;

-- 6. 检查向量是否为空
SELECT
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embedding,
  COUNT(*) - COUNT(embedding) as chunks_without_embedding
FROM document_chunks
WHERE tenant_id = '<your-tenant-id>';

-- ============================================
-- 清理测试数据（谨慎使用！）
-- ============================================
-- 删除指定知识库及其所有文档块
-- DELETE FROM knowledge_bases WHERE id = '<knowledge-base-id>';

-- 删除租户的所有知识库数据
-- DELETE FROM document_chunks WHERE tenant_id = '<your-tenant-id>';
-- DELETE FROM knowledge_bases WHERE tenant_id = '<your-tenant-id>';
