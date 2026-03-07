# Technical Debt - Sales Assistant Project

## Overview
This document tracks known technical debt items that should be addressed in future iterations.

---

## 🟡 Type Safety & TypeScript Strictness

### Issue 1: Type Assertions in Status Mapping Functions
**Location:** `lib/db/state-history.ts:30, 40`

**Description:**
The `toStatus()` and `toPrismaStatus()` functions use `as` type assertions instead of exhaustive switch-case mapping.

**Current Code:**
```typescript
function toStatus(prismaStatus: CustomerStatus | null): Status | null {
  if (!prismaStatus) return null;
  return prismaStatus as Status;
}
```

**Recommended Fix:**
```typescript
function toStatus(prismaStatus: CustomerStatus | null): Status | null {
  if (!prismaStatus) return null;
  switch (prismaStatus) {
    case 'A': return 'A';
    case 'B': return 'B';
    case 'C': return 'C';
    case 'D': return 'D';
    default: {
      const _exhaustive: never = prismaStatus;
      throw new Error(`Unknown status: ${_exhaustive}`);
    }
  }
}
```

**Priority:** P2 (Non-blocking, improve during refactoring phase)

**Rationale:** Both types are `'A' | 'B' | 'C' | 'D'`, so runtime behavior is identical. This is a strictness improvement, not a bug fix.

---

### Issue 2: XState Type Definitions Using Type Assertions
**Location:** `lib/xstate/sales-machine.ts:40, 41`

**Description:**
XState v5 machine setup uses `as` assertions for context and events type hints.

**Current Code:**
```typescript
setup({
  types: {
    context: {} as SalesMachineContext,
    events: {} as SalesMachineEvent,
  },
  // ...
})
```

**Recommended Fix:**
Use XState v5 recommended type-safe patterns (explicit generic parameters or type declaration objects).

**Priority:** P3 (XState framework pattern, low risk)

**Rationale:** This is the standard XState v5 pattern from official documentation. While technically an assertion, it's framework-idiomatic and widely used.

---

### Issue 5: Type Assertions in Gap Analysis Functions (M4)
**Location:** `lib/ai/gap-analysis.ts:123, 207`

**Description:**
`analyzeCustomerInput()` and `mergeProfiles()` still use `as CustomerProfile` assertions instead of Zod-inferred types.

**Recommended Fix:**
```typescript
type CustomerProfileFromSchema = z.infer<typeof customerProfileSchema>;
// 让函数直接返回推导类型
```

**Priority:** P2 (Non-blocking, improve during refactoring)

**Rationale:** Customer detail page 已使用 safeParse，但内部函数仍有断言。可在后续迭代中优化。

---

### Issue 6: Error Logging Missing Detailed Issues (M4)
**Location:** `app/(dashboard)/customer/[id]/page.tsx:115`

**Description:**
解析失败日志仅记录 `error.message`，缺少 `parseResult.error.issues` 详细信息。

**Recommended Fix:**
```typescript
console.error('[CustomerPage] profileData parse failed', {
  customerId: customer.id,
  tenantId,
  error: parseResult.error.message,
  issues: parseResult.error.issues.slice(0, 5), // 截断避免日志爆炸
});
```

**Priority:** P3 (Non-blocking, observability improvement)

---

## 🔐 Security (Deferred to Milestone 5)

### Issue 4: Tenant ID from Request Body
**Location:** `app/api/gap-analysis/route.ts:125`

**Description:**
`tenantId` is accepted from request body instead of authenticated session context.

**Status:** CEO Risk Acceptance granted. Deferred to Milestone 5 (Authentication Middleware).

**TODO Comment:** Already present in code.

---

### Issue 7: Tenant ID from Environment Variable (M4)
**Location:** `app/(dashboard)/customer/[id]/page.tsx:92`

**Description:**
`tenantId` 从全局环境变量获取，而非请求级认证上下文。

**Status:** 已标记 TODO(Milestone 5)，M5 将实现认证中间件。

**Priority:** P1 (Milestone 5 必须修复)

---

## 🔧 CI/CD Improvements

### Issue 8: Prisma Generate Missing in CI
**Location:** CI pipeline

**Description:**
本地 `tsc --noEmit` 被 Prisma 生成物缺失阻塞（`lib/db/client.ts` 引用 `../../generated/prisma`）。

**Recommended Fix:**
在 CI 增加 `prisma generate` 前置步骤后再做类型检查。

**Priority:** P3 (Non-blocking, CI improvement)

---

## 🚀 Milestone 6: True Generative UI (Streaming)

### Issue 9: Server Action 运行时校验缺失
**Location:** `lib/ai/strategy-server.ts`

**Description:**
Server Action 中定义了 `strategyRequestSchema`（使用 `customerProfileSchema.partial()`），但未执行 `safeParse` 运行时校验。

**Current Code:**
```typescript
// schema 定义存在但未使用
const strategyRequestSchema = z.object({
  profileData: customerProfileSchema.partial().optional(),
  // ...
});

// generateStrategyStream 函数直接使用参数，未校验
export async function generateStrategyStream(
  profileData: Partial<CustomerProfile> | undefined,
  // ...
)
```

**Chief Architect 批注:**
> ⚠️ **严厉警告**：Next.js Server Action 暴露的是真实 HTTP 接口，TypeScript 静态类型无法防御运行时的恶意构造请求。后续重构**必须**补齐 Zod 运行时校验 (`safeParse`)。

**Recommended Fix:**
```typescript
export async function generateStrategyStream(
  rawProfileData: unknown,
  status: unknown,
  // ...
) {
  // 运行时校验
  const validation = strategyRequestSchema.safeParse({
    profileData: rawProfileData,
    status,
    classification,
    customerId,
  });
  
  if (!validation.success) {
    throw new Error(`Invalid request: ${validation.error.message}`);
  }
  
  const { profileData, status: validatedStatus } = validation.data;
  // ...
}
```

**Priority:** P1 (安全漏洞，必须修复)

---

### Issue 10: 类型断言绕过类型安全
**Location:** 
- `lib/ai/strategy-server.ts:124` - `partial as Strategy`
- `components/strategy-streamer.tsx:65` - `streamableValue as any`

**Description:**
AI SDK v3.4.33 的流式类型与 TypeScript 静态类型存在不兼容，使用 `as` 断言绕过。

**Current Code:**
```typescript
// strategy-server.ts
for await (const partial of result.partialObjectStream) {
  streamable.update(partial as Strategy);  // ⚠️ 类型断言
}

// strategy-streamer.tsx
const [data, error, isLoading] = useStreamableValue<Strategy>(streamableValue as any);
```

**Recommended Fix:**
等待 AI SDK v4 更新，或在类型定义中使用 `DeepPartial` 兜底。

**Chief Architect 批注:**
> 这是 SDK 层面的限制，当前可接受。但需要在上游库更新后第一时间回归测试。

**Priority:** P2 (SDK 限制，可接受但需监控)

---

### Issue 11: 跨租户越权读取风险
**Location:** `lib/ai/strategy-server.ts:76`

**Description:**
Server Action 仅调用 `requireAuth()` 验证用户已登录，未校验 `customerId` 与 `tenantId` 的归属关系。

**Current Code:**
```typescript
export async function generateStrategyStream(
  profileData: Partial<CustomerProfile> | undefined,
  status: 'A' | 'B' | 'C' | 'D',
  classification: ClassificationResult,
  customerId?: string  // ⚠️ 未校验归属
) {
  // 只验证登录状态，未验证资源归属
  await requireAuth();
  // ...
}
```

**Chief Architect 批注:**
> ⚠️ **严厉警告**：B2B SaaS 中"只读"操作也可能导致跨租户数据泄露。后续**必须**在生成策略前，校验 `tenant_id` 与 `customer_id` 的归属权。即使是 AI 生成场景，也要确保租户隔离。

**Recommended Fix:**
```typescript
export async function generateStrategyStream(
  // ...
  customerId: string
) {
  const session = await requireAuth();
  const tenantId = session.tenantId;
  
  // ✅ 校验客户归属
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });
    
    if (!customer) {
      throw new Error('Unauthorized: Customer does not belong to this tenant');
    }
  }
  // ...
}
```

**Priority:** P1 (安全漏洞，必须修复)

---

## 📝 Notes

- All items marked P2/P3 are non-blocking for Milestone 4 completion
- Technical debt will be addressed during post-MVP refactoring phase
- M4 passed Codex 4th review with PASS status (no blocking issues)
- M6 passed Codex review with ACCEPTABLE status (3 medium issues documented)

**Last Updated:** 2026-03-03
**Milestone:** 6 (True Generative UI - Streaming)

---

## 🔌 AI SDK Compatibility Issues

### Issue 12: Minimax API 伪流式响应
**Location:** AI Provider Integration

**Description:**
Minimax API 虽然声称兼容 OpenAI 协议，但不支持真正的流式响应。表现为：
- 后端等待模型完全生成完毕后一次性返回
- 前端无法实现渐进式渲染
- 响应时间长（20-38 秒）
- 日志警告：`The streamable value has been slow to update`

**验证结果（2026-03-03）：**
- ✅ Qwen3-Next-80B-A3B：真流式，响应均匀
- ❌ Minimax：伪流式，一次性返回

**技术决策：**
正式接受 Qwen3-Next-80B-A3B 作为默认推理模型。Minimax 问题属于 AI SDK 兼容性范畴，暂不处理。

**Priority:** P3 (已有替代方案，不影响核心功能)

**Status:** 已记录，暂不修复



### Issue 13: Strategy Generation Not Fully Migrated to Unified Task Executor
**Location:** `lib/ai/strategy-server.ts`

**Description:**
Model adaptation foundation is complete, but strategy-generation is still only partially connected to the unified task execution layer. Streaming semantics are not yet fully unified under `task-executor`.

**Risk:**
- provider differences may still leak into strategy path
- streaming behavior may remain inconsistent
- future self-hosted model migration becomes harder

**Recommended Fix:**
Complete P2 migration:
- move strategy-generation routing into unified executor
- support streaming-compatible execution variant
- preserve domain guard, fallback, runtime validation, and tenant safety

**Priority:** P1

---

### Issue 14: Model Evaluation Logging Not Yet Formalized
**Location:** AI task execution / observability layer

**Description:**
Current system lacks a formal, persistent evaluation log for model routing quality across tasks.

**Recommended Fix:**
For each AI task, record:
- task type
- model
- reasoning / non-reasoning
- success / schema failure / fallback
- latency
- domain violation
- output source

**Priority:** P2
