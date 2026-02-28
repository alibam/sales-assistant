# OpenClaw Coding Agent - Business Logic & Glossary

## 1. The Core Execution Pipeline
When a sales rep interacts with the system, follow this sequence:
- **Step 1: Gap Analysis (Perception):** Use LLM to extract data and fill the `profile_schema.json`. Support two modes:
  - *Micro-Gap (Continuous Chat):* Sales rep drops a quick update. AI updates the profile and immediately asks for missing critical info.
  - *Macro-Gap (Long Import):* Sales rep imports a long call transcript. AI fills multiple slots and generates a comprehensive "Missing Info Checklist".
- **Step 2: State Evaluation (Cognition):** ONLY after Step 1, evaluate the customer's intent (A/B/C/D). Compare current state with previous state to detect momentum (up/down).
- **Step 3: Strategy Generation (Execution):** Output specific talk-tracks (Script) and next actions (Action Plan).

## 2. Customer Classification (A/B/C/D)
- **A (Ready to Buy):** Budget confirmed, decision-maker aligned, timeframe immediate.
- **B (Hesitant/Comparing):** High intent but blocked by specific objections (price, competitors).
- **C (Low Intent/Nurture):** Fits the profile but lacks immediate urgency or budget.
- **D (Unqualified/Lost):** Does not fit the profile or explicitly rejected.

## 3. B2B Sales Glossary
- **Coach (内部教练/内线):** A stakeholder inside the client company who guides our sales rep and wants us to win.
- **Economic Buyer:** The person who ultimately controls the budget and signs the contract.
- **Champion:** A power user or mid-level manager who actively sells our solution internally.