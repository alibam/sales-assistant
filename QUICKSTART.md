# 🚀 RAG 向量化流水线快速启动指南

## 📋 前置条件

1. ✅ 数据库已迁移（包含 `knowledge_bases` 和 `document_chunks` 表）
2. ⏳ CEO 部署的 Qwen3-Embedding 端点已就绪
3. ⏳ 环境变量已配置

## 🔧 环境变量配置

编辑 `.env` 文件，添加以下配置：

```env
# RAG Embedding API Configuration
EMBEDDING_API_URL=http://your-qwen3-endpoint.com/v1/embeddings
EMBEDDING_API_KEY=sk-your-api-key-here
EMBEDDING_MODEL=qwen3-embedding
```

## 🧪 快速测试

### 1. 运行单元测试
```bash
npx tsx lib/ai/__tests__/document-processor.test.ts
```

预期输出：
```
✅ 测试 1: 短文本 - 通过
✅ 测试 2: 长文本按段落切分 - 通过
✅ 测试 3: 超长段落强制切分 - 通过
✅ 测试 4: 自定义参数 - 通过
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问管理员看板
```
http://localhost:3000/dashboard
```

### 4. 上传测试文档

使用 `scripts/test-data-samples.md` 中的测试数据：

**推荐测试顺序**：
1. 先上传"测试文档 1"（短文本）- 验证基本功能
2. 再上传"测试文档 2"（中等长度）- 验证切片逻辑
3. 最后上传"测试文档 3"（长文本）- 验证批量处理

### 5. 验证数据库

使用 `scripts/verify-rag-pipeline.sql` 中的 SQL 语句：

```sql
-- 1. 查看知识库列表
SELECT * FROM knowledge_bases WHERE tenant_id = '<your-tenant-id>';

-- 2. 查看文档块（验证向量维度）
SELECT
  id,
  LEFT(content, 50) as preview,
  array_length(embedding, 1) as vector_dim
FROM document_chunks
WHERE tenant_id = '<your-tenant-id>';
```

预期结果：
- `vector_dim` 应该全部为 `1024`
- 文档块数量应该与上传时的提示一致

## 🎯 功能验证清单

- [ ] 环境变量配置完成
- [ ] 单元测试通过
- [ ] 开发服务器启动成功
- [ ] 管理员看板可访问
- [ ] 上传短文本成功
- [ ] 上传中等长度文本成功
- [ ] 上传长文本成功
- [ ] 数据库记录正确
- [ ] 向量维度为 1024
- [ ] 文本块数量正确

## 🐛 常见问题

### 问题 1: "EMBEDDING_API_URL 环境变量未配置"
**解决方案**: 检查 `.env` 文件是否包含 `EMBEDDING_API_URL` 配置

### 问题 2: "Embedding API 调用失败 (401)"
**解决方案**: 检查 `EMBEDDING_API_KEY` 是否正确

### 问题 3: "Embedding 向量维度错误"
**解决方案**: 确认 Qwen3-Embedding 端点返回的是 1024 维向量

### 问题 4: 上传后没有数据
**解决方案**:
1. 检查浏览器控制台是否有错误
2. 检查服务器日志
3. 使用 SQL 查询验证数据是否真的没有插入

### 问题 5: TypeScript 类型错误
**解决方案**: 运行 `npx tsc --noEmit` 查看详细错误信息

## 📊 性能参考

- **短文本**（< 500 字）: ~1-2 秒
- **中等长度**（500-2000 字）: ~3-5 秒
- **长文本**（> 2000 字）: ~10-20 秒

实际时间取决于：
- Embedding API 响应速度
- 网络延迟
- 文本块数量

## 🎉 成功标志

当你看到以下提示时，说明功能正常：

```
✅ 成功上传文档「测试文档 v1.0」，共 3 个文本块
```

数据库查询结果：
```
 id | preview | vector_dim
----+---------+------------
 ... | ...     | 1024
 ... | ...     | 1024
 ... | ...     | 1024
```

## 🚀 下一步

功能验证通过后，可以：
1. 上传真实的业务文档（产品手册、销售话术等）
2. 实现向量检索功能（语义搜索）
3. 集成到销售助手对话流程
4. 添加知识库管理界面（列表、删除、更新）

---

**祝测试顺利！RAG 业务大脑即将上线！** 🎊
