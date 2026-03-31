---
children_hash: 3703748cfab48bf5722d157b69f88c1ec37ea41389fe90cd4eb092ca4c14cfd6
compression_ratio: 0.5140041493775933
condensation_order: 1
covers: [agent_framework_decision_for_realtime_flow.md, byterover_global_mode_cwd_requirement.md, context.md]
covers_token_total: 1928
summary_level: d1
token_count: 991
type: summary
---
# ai_runtime

## Overview
The `ai_runtime` topic captures how ChatBot-Oficial executes AI in customer-facing realtime flows and the operational constraints around that runtime. It centers on a custom, deterministic execution path built around `callDirectAI()` and distinguishes between hot-path runtime concerns versus optional asynchronous agent-style modules. See `agent_framework_decision_for_realtime_flow.md` and the topic `context.md`.

## Core Runtime Architecture
From `agent_framework_decision_for_realtime_flow.md`:

- ChatBot-Oficial is a **multi-tenant WhatsApp SaaS** built with **Next.js**.
- Realtime execution follows a bounded pipeline:
  - `incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`
- The platform uses its own **serverless pipeline with 13 nodes** and internal routing logic.
- The main customer-facing AI runtime is **`callDirectAI()`**, not LangChain or LangGraph.

## What `callDirectAI()` Owns
`agent_framework_decision_for_realtime_flow.md` establishes `callDirectAI()` as the normalized runtime layer responsible for:

- provider access
- per-client credential resolution via Vault
- budget enforcement
- usage tracking
- tool-call normalization
- agent/config overrides through `getClientConfig()`

Relevant runtime overrides noted for the active agent include:

- prompt
- provider
- model
- feature flags such as:
  - `enableTools`
  - `enableRAG`
  - `enableHumanHandoff`

## Realtime Design Constraints
The topic-level decision is that the **hot path must remain predictable and fail-safe**.

Key constraints from `agent_framework_decision_for_realtime_flow.md`:

- latency predictability is required for WhatsApp atendimento flows
- tool usage in the hot path must be **explicitly bounded**
- tool processing should remain deterministic rather than delegated to heavier orchestration frameworks

Examples of explicitly cited hot-path tools:

- `transferir_atendimento`
- `buscar_documento`

## Framework Adoption Decision
The main architectural decision, documented in `agent_framework_decision_for_realtime_flow.md`, is:

- **heavy agent frameworks** such as **Deep Agents** are **not suitable as the core runtime** for realtime customer-service flows
- such frameworks may still be used in:
  - separate asynchronous modules
  - internal automations
  - backoffice copilots

This preserves a strict separation between:

- **realtime customer-facing execution** → `callDirectAI()` path
- **non-core / async orchestration** → optional heavier agent frameworks

## Governing Guidance
`agent_framework_decision_for_realtime_flow.md` also links this direction to existing project guidance:

- **ADR-006** is treated as supporting reuse of `callDirectAI()`
- **LangChain** remains **optional**, especially for CRM/classification workloads, not as the principal runtime

## Environment/Operational Rule for Agents
From `byterover_global_mode_cwd_requirement.md`:

This topic also records an environment-specific rule affecting agent operations around this repository:

- ByteRover MCP runs in **global mode**
- every ByteRover **query/retrieve** and **curate/store** call must pass:
  - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`

This is documented as:

- an **environment mode detail**
- **not** an installation bug by default

Instruction sources updated to enforce this rule:

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`

## Relationships
- `context.md` defines the topic scope as the runtime AI execution model and framework-adoption constraints for realtime flows.
- `agent_framework_decision_for_realtime_flow.md` contains the primary architectural decision and runtime model.
- `byterover_global_mode_cwd_requirement.md` adds the repository-specific operational requirement for agent interactions with ByteRover tooling.
- Related broader reference: `facts/project` for repository-level facts and sanity checks.