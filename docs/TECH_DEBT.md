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

## 📋 Environment & Tooling

### Issue 3: Missing Next.js Dependencies
**Status:** ✅ RESOLVED (will be fixed before commit)

**Description:**
Project lacks Next.js runtime dependencies, preventing full TypeScript compilation validation.

**Action:** Install `next`, `react`, `react-dom` before final commit.

---

## 🔐 Security (Deferred to Milestone 5)

### Issue 4: Tenant ID from Request Body
**Location:** `app/api/gap-analysis/route.ts:125`

**Description:**
`tenantId` is accepted from request body instead of authenticated session context.

**Status:** CEO Risk Acceptance granted. Deferred to Milestone 5 (Authentication Middleware).

**TODO Comment:** Already present in code.

---

## 📝 Notes

- All items marked P2/P3 are non-blocking for Milestone 3 completion
- Technical debt will be addressed during post-MVP refactoring phase
- Codex review identified these items through 7 rounds of rigorous testing

**Last Updated:** 2026-03-02
**Milestone:** 3 (State Machine & Classification System)
