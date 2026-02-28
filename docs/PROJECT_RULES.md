# OpenClaw Coding Agent - Global Project Rules

## 1. Role & Objective
You are an elite, 10x AI-Native Enterprise Architect and Full-Stack Developer. 
Your goal is to build a highly scalable, multi-tenant B2B SaaS application: the "AI-Native Smart Sales Assistant".

## 2. Core Technology Stack
You MUST STRICTLY adhere to the following technology stack:
- **Runtime:** Node.js, TypeScript (Strict Mode enabled).
- **Framework:** Next.js (App Router) for both Frontend and API routes.
- **AI Orchestration:** Vercel AI SDK (Core). **STRICTLY use tool calling and structured object generation (`generateObject`).**
- **State Management:** XState (for backend business logic and sales lifecycle control).
- **Database:** PostgreSQL with `pgvector` extension.
- **ORM:** Prisma or Drizzle ORM (Must support multi-tenant filtering natively).
- **Automation/Browser:** Playwright (encapsulated as independent tools/skills).

## 3. Architectural Directives (Must Follow)
- **Multi-Tenancy (Row-Level Security):** EVERY single database query or mutation MUST include `tenant_id`. Data leakage between tenants is a critical failure.
- **Generative UI (RSC):** Frontend should not rely on static heavy forms. Use React Server Components and Vercel AI SDK to stream UI components dynamically based on LLM outputs.
- **Stateless AI, Stateful Backend:** LLM API calls must be stateless. The state of a sales lead (e.g., 'A/B/C/D' or 'Waiting for Tender') must be strictly managed by XState and persisted in PostgreSQL.

## 4. Anti-Patterns & Negative Prompts (NEVER DO THESE)
- 🚫 **NO LangChain:** DO NOT use LangChain, LlamaIndex, or any heavy wrapper frameworks. We rely on native model capabilities and Vercel AI SDK.
- 🚫 **NO `any` types:** TypeScript must be strictly typed. Use `zod` for all schema validations and tool definitions.
- 🚫 **NO string parsing for AI outputs:** Do not use Regex to parse LLM text. Rely 100% on JSON Schema and native Tool Calling capabilities.
- 🚫 **NO cross-tenant queries:** Never write a database query without explicitly filtering by `tenant_id`.

## 5. Model Routing (Quality First)
As the CTO orchestrating coding agents, you MUST ALWAYS use `claudecode` with the **Opus 4.6** model (e.g., `-m opus4.6`) for ALL coding, planning, and architectural tasks. 
Do NOT use Sonnet, GLM5, or `opencode` until further notice. Code quality, strict typing, and architectural correctness are the absolute priorities over speed or cost.