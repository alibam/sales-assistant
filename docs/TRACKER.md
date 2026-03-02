# Project Tracker - AI-Native Smart Sales Assistant

## Project Location
`projects/sales-assistant/` - 所有项目代码在此目录

## Overview
Multi-tenant B2B SaaS application for intelligent sales lifecycle management with AI-powered gap analysis, state machine control, and generative UI.

---

## Milestone 1: Data Foundation & Multi-Tenant Schema ✅
**Goal:** Establish PostgreSQL schema with strict tenant isolation, ORM setup, and profile configuration system.

- [x] Initialize Prisma/Drizzle ORM with TypeScript strict mode
- [x] Create core multi-tenant tables (Tenant, Customer, SalesStateHistory)
- [x] Implement Customer table with A/B/C/D status enum and profile_data JSONB
- [x] Add tenant_id foreign keys and indexes across all tables
- [x] Generate sample profile_schema.json for automotive 4S shop use case
- [x] Create database seed scripts with sample tenant data
- [ ] Validate row-level tenant isolation in queries (待数据库连接后验证)

**Files Created:**
- `prisma/schema.prisma` - 多租户数据库 schema
- `prisma/seed.ts` - 数据库种子脚本
- `profile_schema.json` - 汽车 4S 店客户画像 schema
- `package.json` - 依赖和脚本配置
- `.env` - 数据库连接配置

---

## Milestone 2: Core AI Pipeline (Gap Analysis Engine) ✅
**Goal:** Build the Gap Analysis Engine using Vercel AI SDK with structured output and tool calling.

- [x] Set up Vercel AI SDK Core with TypeScript types
- [x] Implement profile_schema.json parser in lib/config/
- [x] Create Gap Analysis Engine with generateObject for slot filling
- [x] Implement entity extraction tools with zod schemas
- [x] Build profile gap detection and follow-up prompt generation
- [x] **Provider Architecture Refactoring** - Environment-driven AI provider
- [x] Create API route for gap analysis endpoint
- [ ] Build Micro-Gap mode (continuous chat with immediate follow-up)
- [ ] Build Macro-Gap mode (long transcript import with comprehensive checklist)
- [ ] Add streaming support for real-time UI updates

**Files Created (M2 Complete):**
- `lib/ai/types.ts` - 完整类型定义（CustomerProfile, ProfileGap, GapAnalysisResult）
- `lib/ai/gap-analysis.ts` - 核心引擎（analyzeCustomerInput, findProfileGaps, generateFollowUpPrompt, runGapAnalysis）
- `lib/ai/provider.ts` - **环境驱动的 AI Provider 配置（@ai-sdk/openai + createOpenAI）**
- `lib/config/profile-schema-loader.ts` - Schema 加载器（zod 验证 + 缓存）
- `app/api/gap-analysis/route.ts` - **Next.js API Route（POST + GET）**
- `.env.example` - **AI provider 环境变量模板**
- `scripts/demo-gap-analysis.ts` - 演示脚本

**Provider Architecture:**
- 使用 `@ai-sdk/openai` 替代 `@ai-sdk/anthropic`
- 通过 `createOpenAI` 支持任意 OpenAI-compatible API
- 环境变量驱动：`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `AI_MODEL_NAME`
- 零硬编码，支持开发环境（第三方 API）和生产环境（本地 Qwen）无缝切换

---

## Milestone 3: State Machine & Classification System ✅
**Goal:** Implement XState-based sales lifecycle state machine with A/B/C/D classification logic.

- [x] Design XState machine for sales lifecycle (A/B/C/D states)
- [x] Define state transition rules and guards
- [x] Implement momentum detection (up/down state changes)
- [x] Create SalesStateHistory persistence layer with Serializable transactions
- [x] Build state evaluation logic based on profile completeness
- [x] Add event-driven state updates via XState Actor
- [x] Integrate state machine with Gap Analysis output
- [x] Create Prisma client singleton for unified database access
- [x] Implement retry logic for serialization conflicts
- [x] Add comprehensive error handling and type safety

**Files Created (M3 Complete):**
- `lib/xstate/sales-machine.ts` - XState v5 状态机（A/B/C/D 生命周期管理）
- `lib/xstate/state-evaluator.ts` - 状态评估逻辑（基于 profile_schema.json 规则）
- `lib/db/client.ts` - **Prisma 单例客户端（统一导入路径）**
- `lib/db/state-history.ts` - 状态历史持久化层（Serializable 事务 + 重试逻辑）
- `lib/services/gap-analysis-service.ts` - **XState Actor 驱动的集成服务**
- `docs/CODE_REVIEW_STANDARD.md` - 代码审查标准（Maker-Checker Protocol）
- `docs/TECH_DEBT.md` - 技术债档案

**Architecture Highlights:**
- **XState Actor 驱动**：使用 `createActor` + `waitFor` 确保状态机控制所有状态变更
- **并发安全**：Prisma Serializable 事务 + 3 次重试 + 指数退避
- **类型安全**：移除大部分 `as` 断言，使用类型映射函数
- **多租户隔离**：所有数据库查询包含 `tenant_id`（CEO Risk Acceptance 豁免认证中间件至 M5）
- **Maker-Checker Protocol**：经过 7 轮 Codex 审查，核心架构已验证

**Known Technical Debt (详见 TECH_DEBT.md):**
- P2: 状态映射函数中的类型断言（可在重构期优化）
- P3: XState 类型定义中的框架惯用断言

---

## Milestone 4: Strategy Generation & Generative UI
**Goal:** Build strategy generator for talk-tracks and action plans, with React Server Components streaming.

- [ ] Implement Strategy Generator using Vercel AI SDK
- [ ] Create talk-track templates for each A/B/C/D state
- [ ] Build action plan generator with next-step recommendations
- [ ] Design Generative UI components with RSC
- [ ] Implement streaming UI updates from AI responses
- [ ] Create dashboard layout with customer profile view
- [ ] Build missing info checklist UI component
- [ ] Add real-time state transition notifications

---

## Milestone 5: Integration & Production Readiness
**Goal:** Complete end-to-end integration, add authentication, monitoring, and deployment configuration.

- [ ] Implement tenant routing middleware
- [ ] Add authentication and authorization layer
- [ ] Create tenant onboarding flow
- [ ] Build admin panel for tenant management
- [ ] Add logging and error tracking
- [ ] Implement rate limiting and security headers
- [ ] Set up CI/CD pipeline
- [ ] Create deployment documentation
- [ ] Performance optimization and load testing
- [ ] Production environment configuration

---

## Current Status
**Active Milestone:** Milestone 2 完成 ✅  
**Last Updated:** 2026-03-01 09:10  
**Milestone 1 Completed:** ✅ 数据基石与多租户 Schema  
**Milestone 2 Completed:** ✅ Gap Analysis Engine + Provider 架构重构

**Next Action:** 准备推送代码，或进入 Milestone 3（State Machine）
