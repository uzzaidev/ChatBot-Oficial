---
children_hash: 804fd3012cc69a09576666d4520d91aeffd5af6fa154301cf48d23d5a07f7045
compression_ratio: 0.7189648200566114
condensation_order: 2
covers: [ai_runtime/_index.md, context.md, project_state/_index.md]
covers_token_total: 2473
summary_level: d2
token_count: 1778
type: summary
---
# architecture

## Overview
The `architecture` domain captures core system design decisions, runtime behavior, and dated repository-state knowledge for ChatBot-Oficial. Across `ai_runtime/_index.md`, `project_state/_index.md`, and domain `context.md`, the dominant pattern is a **multi-tenant WhatsApp SaaS** built on a **Next.js-based** stack with a **deterministic realtime AI path** centered on `callDirectAI()` rather than heavy agent orchestration.

## Domain Scope
From `context.md`:

- Focuses on:
  - AI runtime execution paths
  - orchestration and framework-adoption decisions
  - latency and fail-safe constraints
  - integration boundaries between core runtime and auxiliary modules
- Excludes:
  - generic product-management notes
  - customer-specific configuration without architectural impact
- Ownership: platform architecture and AI integration layer

## Topic: ai_runtime
Drill-down: `ai_runtime/_index.md`, `agent_framework_decision_for_realtime_flow.md`, `byterover_global_mode_cwd_requirement.md`

### Core runtime model
- Realtime customer-facing execution is explicitly:
  - `incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`
- The platform uses an internal **serverless pipeline with 13 nodes**.
- `callDirectAI()` is the normalized runtime layer for:
  - provider access
  - Vault-based per-client credential resolution
  - budget enforcement
  - usage tracking
  - tool-call normalization
  - agent/config overrides through `getClientConfig()`

### Runtime configuration and hot-path limits
- Important runtime overrides include:
  - `prompt`
  - `provider`
  - `model`
  - `enableTools`
  - `enableRAG`
  - `enableHumanHandoff`
- The architectural rule is that WhatsApp atendimento flows must remain:
  - predictable
  - latency-bounded
  - fail-safe
- Hot-path tools are intentionally explicit and bounded, with cited examples:
  - `transferir_atendimento`
  - `buscar_documento`

### Framework decision
- `agent_framework_decision_for_realtime_flow.md` preserves the key decision:
  - **Deep Agents / heavy agent frameworks are not the core runtime for realtime flows**
- Those frameworks remain acceptable only for:
  - asynchronous modules
  - internal automations
  - backoffice copilots
- This creates a durable separation:
  - realtime customer-facing path → `callDirectAI()`
  - non-core orchestration → optional heavier frameworks
- Related guidance:
  - **ADR-006** supports reuse of `callDirectAI()`
  - **LangChain** is optional, especially for CRM/classification work, not the principal runtime

### Operational tooling constraint
- `byterover_global_mode_cwd_requirement.md` adds a repository-specific operational rule:
  - ByteRover MCP runs in **global mode**
  - all query/retrieve and curate/store calls must pass  
    `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- This is treated as an environment-mode requirement, not an installation defect.
- Enforcement was added to:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.github/copilot-instructions.md`

## Topic: project_state
Drill-down: `project_state/_index.md`, `chatbot_oficial_snapshot_2026_03_31.md`, `commercial_deck_mobile_pdf_export_pattern.md`

### Repository and platform snapshot
- As of `2026-03-31`, ChatBot-Oficial is recorded as a production-active **multi-tenant SaaS for WhatsApp customer service with AI**.
- Stack/version signals preserved in `chatbot_oficial_snapshot_2026_03_31.md`:
  - **Next.js 16**
  - **React 18**
  - **Supabase**
  - **Stripe**
  - **Redis**
  - **AI SDK / OpenAI / Groq**
  - **Capacitor**
  - **Jest**
- Architecture state is summarized as:
  - **webhook + serverless flow + `callDirectAI`**

### Current implementation emphasis and repo health
- Recent work is concentrated around Meta/WhatsApp integration, including:
  - contact/history sync
  - unified multi-tenant webhook
  - SMB echoes
  - Embedded Signup onboarding
  - dashboard/settings work
  - stronger logging and error handling
- Validation signals:
  - tests: **3 suites / 10 tests**
  - lint: **0 errors, 12 warnings**
  - build confirmation was partial due to a later **EPERM spawn** issue interpreted as environment/sandbox-related
- Documentation drift is explicitly tracked:
  - `README.md` says **Next.js 14**
  - `package.json` indicates **Next.js 16**
- Uncommitted local drift included:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.github/copilot-instructions.md`
  - `UzzApp_Apresentacao_Comercial.html`

### Commercial deck export pattern
- `commercial_deck_mobile_pdf_export_pattern.md` documents a reusable HTML slide export architecture that preserves mobile responsiveness without breaking PDF fidelity.
- Main files:
  - `docs/UzzApp_Apresentacao_Comercial_v2.html`
  - `scripts/export-uzzapp-commercial-pdf.js`
  - output `docs/UzzApp_Apresentacao_Comercial_v2.pdf`

### Design decision for screen vs print
- Slides remain fixed at **1280x720**.
- Internal absolute-positioned slide content is not reflowed.
- Responsiveness is achieved by scaling the whole deck/slide, using:
  - `--slide-width`
  - `--slide-height`
  - `--deck-scale`
  - `transform: scale(var(--deck-scale))`
- Negative margin compensation preserves the original slide coordinate system while shrinking visually on screen.

### PDF/export stability pattern
- Print rendering uses explicit `@media print` overrides for:
  - width
  - height
  - min-height
  - max-height
  - overflow
  - position
  - `transform: none`
  - page-break behavior
- Export-safe mode uses `body.export-pdf` to disable PDF-hostile visual effects such as:
  - glow pseudo-elements
  - gradient text clipping
  - backdrop blur
  - device shadows/notches
- Puppeteer export flow preserves deterministic output through:
  - viewport `1280x720`
  - `emulateMediaType("print")`
  - waiting for `document.fonts.ready`
  - `page.pdf({ preferCSSPageSize: true })`
- Output result preserved:
  - deterministic **12-page PDF**
  - corrected asset references under:
    - `docs/Prints google`
    - `docs/ios/screenshots/auth-ipad-13in`

## Cross-topic relationships
- `ai_runtime/_index.md` defines how customer-facing AI executes in production and why heavy frameworks are excluded from the hot path.
- `project_state/_index.md` records the dated operational truth of the repository and a concrete front-end/export architecture pattern.
- Together they show a consistent architectural stance:
  - deterministic, bounded runtime in production
  - explicit separation between core execution and auxiliary tooling
  - dated repository snapshots used to capture drift, validation status, and current implementation direction

## Preserved recurring patterns
- **Deterministic core runtime** over generalized agent orchestration
- **Strict hot-path boundaries** for latency-sensitive WhatsApp flows
- **Date-stamped state capture** for repository truth and drift tracking
- **Environment-specific operational rules** documented as part of architecture practice
- **Fixed-layout screen scaling + explicit print overrides** as the preferred pattern for reliable HTML-to-PDF export