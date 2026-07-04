---
children_hash: ace80bddc8caefb4828764f1107c883e5d0d15341888874a4f94b3bf1ff0c2c2
compression_ratio: 0.3056122448979592
condensation_order: 1
covers: [agent_framework_decision_for_realtime_flow.md, byterover_global_mode_cwd_requirement.md, context.md]
covers_token_total: 1960
summary_level: d1
token_count: 599
type: summary
---
# ai_runtime

## Overview
ChatBot-Oficial’s AI runtime is centered on a realtime, multi-tenant execution path that prioritizes predictable latency, fail-safe orchestration, and explicit tool handling over heavy agent frameworks. The topic also captures an environment-specific ByteRover MCP operational requirement that affects how agents query and curate knowledge from this repository.

## Structural Themes

- **Realtime AI execution model**  
  - The main customer-facing path uses `callDirectAI()` as the normalized AI execution layer.
  - Flow shape: incoming webhook → flow routing → serverless node pipeline → `callDirectAI()` → explicit tool processing/handoff → response.
  - The runtime is described as a multi-tenant WhatsApp SaaS in Next.js with a custom serverless pipeline of 13 nodes.

- **Framework adoption decision**  
  - Heavy frameworks such as LangChain, LangGraph, and especially Deep Agents are not used on the realtime hot path.
  - These frameworks are considered acceptable only in isolated asynchronous modules for internal automations, backoffice copilots, CRM, or classification use cases.
  - ADR-006 is referenced as guidance to reuse `callDirectAI()` and keep LangChain optional rather than core.

- **Runtime dependencies and constraints**  
  - `callDirectAI()` depends on per-client Vault credential resolution, budget enforcement, usage tracking, and configuration overrides from `getClientConfig()`.
  - The hot path is constrained by limited, explicitly processed tools to preserve deterministic behavior and fail-safe execution.
  - Example overridden flags include `enableTools`, `enableRAG`, and `enableHumanHandoff`.

- **Repository operational requirement for ByteRover**  
  - ByteRover MCP runs in global mode in this environment, so every query/retrieve and curate/store call must pass the repository cwd explicitly.
  - The required cwd is `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial`.
  - This is treated as an environment mode detail, not an installation bug.

## Drill-down Entries
- `agent_framework_decision_for_realtime_flow.md` — framework choice, realtime flow architecture, ADR-006 alignment, and the `callDirectAI()` hot path.
- `byterover_global_mode_cwd_requirement.md` — explicit cwd requirement for ByteRover MCP operations in this repository.
- `context.md` — top-level topic overview, key concepts, and related topic reference.