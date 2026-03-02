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

## 📝 Notes

- All items marked P2/P3 are non-blocking for Milestone 4 completion
- Technical debt will be addressed during post-MVP refactoring phase
- M4 passed Codex 4th review with PASS status (no blocking issues)

**Last Updated:** 2026-03-02
**Milestone:** 4 (Strategy Generation & Generative UI)
