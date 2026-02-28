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

## Milestone 2: Core AI Pipeline (Gap Analysis Engine)
**Goal:** Build the Gap Analysis Engine using Vercel AI SDK with structured output and tool calling.

- [ ] Set up Vercel AI SDK Core with TypeScript types
- [ ] Implement profile_schema.json parser in lib/config/
- [ ] Create Gap Analysis Engine with generateObject for slot filling
- [ ] Build Micro-Gap mode (continuous chat with immediate follow-up)
- [ ] Build Macro-Gap mode (long transcript import with comprehensive checklist)
- [ ] Implement entity extraction tools with zod schemas
- [ ] Create API route for gap analysis endpoint
- [ ] Add streaming support for real-time UI updates

---

## Milestone 3: State Machine & Classification System
**Goal:** Implement XState-based sales lifecycle state machine with A/B/C/D classification logic.

- [ ] Design XState machine for sales lifecycle (A/B/C/D states)
- [ ] Define state transition rules and guards
- [ ] Implement momentum detection (up/down state changes)
- [ ] Create SalesStateHistory persistence layer
- [ ] Build state evaluation logic based on profile completeness
- [ ] Add event-driven state updates (no direct status mutations)
- [ ] Integrate state machine with Gap Analysis output
- [ ] Create state visualization for debugging

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
**Active Milestone:** Milestone 2 (Core AI Pipeline)  
**Last Updated:** 2026-02-28 19:40  
**Milestone 1 Completed:** ✅ 数据基石与多租户 Schema 已建立

**Next Action:** 开始 Milestone 2 - Gap Analysis Engine 开发
