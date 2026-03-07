# AI Strategy Memory
> Long-term memory for AI architecture, model routing, and current execution priorities.
>
> Owner: CEO / Chief Architect
> Execution Agents: OpenClaw (opus), Claude Code (claude), Codex (codex), QA Agent
> Last Updated: 2026-03-07

---

## 1. Purpose

This document is the **long-term memory layer** for the Sales Assistant project.

It exists to prevent repeated architectural drift across conversations, coding rounds, and model experiments.

This file stores:
- stable AI architecture decisions
- model routing strategy
- provider compatibility facts
- current stage priorities
- explicit red lines that must not regress

This file is **not** a replacement for:
- `ARCHITECTURE.md` (system-wide architecture rules)
- `PROJECT_RULES.md` (engineering and quality rules)
- `TRACKER.md` (milestone progress)
- `TECH_DEBT.md` (known debt and deferred issues)

It is the memory bridge between them.

---

## 2. Non-Negotiable Architecture Baseline

The project must continue to follow the strict sequential pipeline:

1. **Gap Analysis / Slot Filling**
2. **XState State Evaluation / Classification**
3. **Strategy Generation**

No step may bypass this sequence.

Key rule:
- Gap Analysis updates profile
- XState owns lifecycle transition / A-B-C-D classification
- Strategy generation consumes the updated profile and classification
- Frontend must not bypass state machine ownership

---

## 3. Long-Term AI Orchestration Principles

### 3.1 Framework Minimalism
We continue to reject heavy black-box orchestration frameworks.

Must keep:
- Vercel AI SDK Core
- model-native structured generation
- zod runtime validation
- explicit guardrails
- explicit fallback

Must avoid:
- LangChain / LlamaIndex style heavy wrappers
- uncontrolled provider-specific branching in business files
- regex-driven parsing spreading across the system

### 3.2 Stateless AI, Stateful Backend
LLM calls remain stateless.
Business state remains owned by:
- XState
- PostgreSQL
- tenant-scoped server logic

### 3.3 Safety Before Beauty
For critical user-facing AI output:
- illegal output must never reach the UI first
- validation must happen before final output is streamed/rendered
- fallback is acceptable if it prevents domain corruption

---

## 4. Current Production Model Strategy (Approved)

### 4.1 Current task-to-model routing
Approved current routing:

- **Gap Analysis**
  - Primary: `self-hosted-qwen3-80b-a3b`
  - Mode: **non-reasoning**
  - Goal: fast, stable structured extraction

- **Strategy Generation**
  - Primary: `aliyun-qwen3.5-plus`
  - Mode: **reasoning**
  - Goal: higher-quality synthesis and strategy generation

- **Fallback**
  - Primary: deterministic local fallback
  - Mode: non-reasoning
  - Goal: safe recovery, not creativity

- **MiniMax-2.5**
  - Role: backup / experiment / shadow only
  - Not allowed in current main strategy chain

### 4.2 Why this routing exists
Reasoning is expensive and should be used only where it creates real business value.

Therefore:
- Gap Analysis is an extraction task, not a creativity task
- Strategy Generation is a synthesis / planning task, so reasoning is justified
- Fallback must prioritize reliability and safety over creativity

---

## 5. Future Model Strategy (Commercial Direction)

This is a **commercial project**, so the long-term direction is:

> move toward a **self-hosted-primary architecture** while keeping external premium models as quality backstop during transition.

### 5.1 Current transitional state
- self-hosted model handles high-frequency structured tasks
- cloud premium model handles current best strategy quality
- local fallback protects UX and domain safety

### 5.2 Planned upgrade path
Current self-hosted model:
- `Qwen3-80B-A3B`

Planned upgrade target:
- `Qwen3.5-122B-A10B` (quantized, self-hosted)

### 5.3 Migration principle
After self-hosted `Qwen3.5-122B-A10B` is ready:

- Gap Analysis should migrate first
- Strategy Generation should enter **shadow comparison mode**
- cloud model remains primary until self-hosted quality proves acceptable

### 5.4 Shadow evaluation requirement
Future strategy comparison must support:
- primary output: cloud reasoning model
- shadow output: self-hosted reasoning candidate
- no user-facing impact during evaluation
- offline comparison across:
  - structured success rate
  - domain violation rate
  - fallback rate
  - latency
  - business relevance

---

## 6. Model Role Abstraction (Do Not Hardcode Business Logic to Physical Model Names)

Business code must not directly depend on model names.

Use logical roles instead:

- `self_hosted_fast_extract`
- `self_hosted_reasoning_candidate`
- `cloud_reasoning_primary`
- `local_safe_fallback`

### Current mapping
- `self_hosted_fast_extract` -> `Qwen3-80B-A3B`
- `cloud_reasoning_primary` -> `aliyun-qwen3.5-plus`
- `local_safe_fallback` -> deterministic fallback
- `self_hosted_reasoning_candidate` -> reserved for future `Qwen3.5-122B-A10B`

### Rule
Task routing depends on **capability role**, not hardcoded model string.

---

## 7. Model Capability Adapter Direction

The system must continue moving toward a unified adapter design inside `lib/ai/`.

Expected architecture pieces:
- `model-capabilities.ts`
- `model-registry.ts`
- `task-router.ts`
- `task-executor.ts`

Responsibilities:
- capability declaration
- task-to-model routing
- reasoning/non-reasoning policy
- schema-safe execution
- provider error normalization
- fallback / degrade handling
- unified result contract

Provider differences must be absorbed inside the AI layer, not leaked to UI or business pages.

---

## 8. Unified AI Task Result Contract

All AI tasks should converge toward a normalized result contract:

```ts
type AiTaskResult<T> =
  | { ok: true; data: T; source: 'primary' | 'fallback'; model: string }
  | {
      ok: false;
      errorType: 'schema' | 'provider' | 'timeout' | 'unsupported';
      message: string;
      model: string;
    };
````

Frontend should consume:

* valid structured data
* normalized error states
* normalized fallback states

Frontend should not consume raw provider-specific malformed output.

---

## 9. Current Known Provider Facts

### 9.1 self-hosted Qwen

Current role:

* best fit for extraction / gap tasks
* suitable for structured tasks
* preferred for cost-sensitive, high-frequency calls

### 9.2 aliyun qwen3.5-plus

Current role:

* best current strategy-generation model
* preferred reasoning model in production
* currently the primary strategy model

### 9.3 MiniMax-2.5

Current fact:

* keep out of main strategy path for now
* treat as compatibility-risk / pseudo-stream candidate
* use only for backup, experiment, or shadow

---

## 10. Current Stage Definition

### P1 Completed

Model adaptation foundation is considered completed when:

* capability registry exists
* task router exists
* task executor exists
* gap-analysis is connected to unified execution
* provider differences start converging inside AI layer

### P2 Current Priority

The **single current priority** is:

> migrate `strategy-generation` into the unified executor path, including streaming-compatible execution.

This is the main unfinished adaptation task.

### P2 must preserve existing safeguards

During strategy migration, the system must not regress on:

* domain guard
* validate-before-final-output
* fallback safety
* safeParse runtime validation
* tenant-safe request handling

---

## 11. Business Safety Memory

### 11.1 Strategy must not reintroduce cross-domain corruption

Automotive retail scenarios must never degrade into:

* financing / lending
* B2B procurement
* enterprise expansion language
* fabricated financial profile details

### 11.2 Known good interpretation for automotive family case

When profile contains signals like:

* 二胎
* 家庭用车
* 安全座椅
* 后排空间
* 宝马 X3 竞品
* 带配偶到店

the strategy system must converge toward:

* family auto retail
* space-focused objection handling
* test-drive / showroom progression
* high-intent comparison handling

and must not regress to D-level generic probing or financing templates.

---

## 12. Logging & Evaluation Memory

From now on, model evaluation should log at least:

* task type
* model used
* reasoning / non-reasoning
* success / schema failure / fallback
* latency
* domain violation triggered or not
* result source (`primary` / `fallback`)

This is required for future self-hosted migration decisions.

---

## 13. Explicit Red Lines

Do not regress on the following:

1. No business-logic hardcoding to physical model names
2. No provider-specific branching scattered in UI/business files
3. No bypassing XState in lifecycle transitions
4. No cross-tenant query without tenant guard
5. No expanding regex-based raw LLM parsing as a default architecture
6. No illegal strategy content streamed to UI before validation
7. No turning MiniMax into default main strategy model before streaming and quality prove stable

---

## 14. How This Memory Should Be Used

When starting a new architecture/coding session:

1. read:

   * `ARCHITECTURE.md`
   * `PROJECT_RULES.md`
   * `TRACKER.md`
   * `TECH_DEBT.md`
   * `AI_STRATEGY_MEMORY.md`

2. align against:

   * current stage priority
   * current production routing
   * long-term migration direction

3. then propose coding work

If a future conversation contradicts this file, the contradiction must be explicitly resolved and written back here.

---

## 15. Next Planned Updates

This file must be updated when any of the following changes:

* self-hosted model is upgraded to `Qwen3.5-122B-A10B`
* strategy-generation completes unified executor migration
* MiniMax re-enters or exits supported matrix
* cloud/self-hosted primary strategy role changes
* shadow comparison for strategy becomes active
* model evaluation metrics become formalized in dashboards

````
