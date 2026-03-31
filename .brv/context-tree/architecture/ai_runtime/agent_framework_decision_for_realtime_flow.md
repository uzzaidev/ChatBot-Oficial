---
title: Agent Framework Decision for Realtime Flow
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-31T12:21:26.973Z'
updatedAt: '2026-03-31T12:21:26.973Z'
---
## Raw Concept
**Task:**
Document the architectural decision criteria for agent framework adoption in ChatBot-Oficial realtime AI flows

**Changes:**
- Recorded that realtime AI execution uses callDirectAI instead of LangChain or LangGraph
- Captured hot-path constraints around latency predictability and fail-safe execution
- Documented that heavy agent frameworks should be isolated to asynchronous internal modules
- Preserved ADR-006 guidance to reuse callDirectAI and keep LangChain optional in non-core scenarios

**Files:**
- checkpoints/2026-02-19_chatbot-oficial/19_AI_TOOLS_AND_HANDOFF.md
- checkpoints/2026-02-19_chatbot-oficial/99_AI_CONTEXT_PACK.md
- checkpoints/2026-03-15_chatbot-oficial/04_ARCHITECTURE_FROM_CODE.md
- checkpoints/2026-03-15_chatbot-oficial/91_MAIN_FLOWS.md

**Flow:**
incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response

**Timestamp:** 2026-03-31

## Narrative
### Structure
ChatBot-Oficial is organized as a multi-tenant WhatsApp SaaS in Next.js with its own serverless execution pipeline composed of 13 nodes and routing logic for conversation flows. The customer-facing AI runtime is centered on callDirectAI(), which acts as the normalized execution layer for provider access, credentials, budgets, usage accounting, and tool-call handling rather than delegating the main path to an external agent framework.

### Dependencies
The runtime depends on per-client credential resolution from the Vault, budget enforcement, usage tracking, and configuration overrides loaded through getClientConfig(). It also depends on a tightly controlled tool surface in the hot path, where operations such as transferir_atendimento and buscar_documento are explicitly bounded and processed to preserve deterministic behavior.

### Highlights
The key architectural decision is that heavier agent frameworks such as Deep Agents do not match the latency and operational constraints of the realtime WhatsApp atendimento core. They are acceptable only as isolated asynchronous modules for internal automations or backoffice copilots. Existing project guidance already aligns with this direction by pointing ADR-006 toward reuse of callDirectAI and by treating LangChain as optional for CRM and classification workloads rather than the principal runtime.

### Rules
Decisão prática: frameworks mais pesados tipo Deep Agents não encaixam como núcleo do atendimento em tempo real; se usados, devem ficar em módulo separado/assíncrono para automações internas ou copilots de backoffice.

### Examples
Flags overridden by the active agent in getClientConfig() include enableTools, enableRAG, and enableHumanHandoff. Explicit hot-path tools cited in the source include transferir_atendimento and buscar_documento.

## Facts
- **product_architecture**: The main product is a multi-tenant WhatsApp SaaS built with Next.js. [project]
- **serverless_pipeline**: The platform uses its own serverless pipeline with 13 nodes and flow routing. [project]
- **primary_ai_runtime**: The main AI execution path uses callDirectAI(), not LangChain or LangGraph. [project]
- **call_direct_ai_capabilities**: callDirectAI() includes AI SDK integration, per-client Vault credentials, budget enforcement, usage tracking, and tool call normalization. [project]
- **agent_runtime_overrides**: The active agent can override prompts, provider, models, and feature flags in getClientConfig(). [project]
- **hot_path_constraints**: The webhook and flow hot path depends on predictable latency, fail-safe behavior, and explicitly processed limited tools. [convention]
- **framework_fit_realtime_core**: Heavy frameworks such as Deep Agents are not a fit as the core of realtime customer service flows. [project]
- **framework_fit_async_modules**: If heavy agent frameworks are used, they should be isolated in separate asynchronous modules for internal automations or backoffice copilots. [project]
- **adr_006_guidance**: Project documents reference ADR-006 as guidance to reuse callDirectAI and keep LangChain optional for CRM and classification use cases. [project]
