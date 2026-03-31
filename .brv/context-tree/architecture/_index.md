---
children_hash: d1e0c0f7d2b398cad2cc9145d505c3d04cafd32e084cc4929f0b86d2904c3a9b
compression_ratio: 0.735191637630662
condensation_order: 2
covers: [ai_runtime/_index.md, context.md, project_state/_index.md]
covers_token_total: 2296
summary_level: d2
token_count: 1688
type: summary
---
# architecture

## Scope
The `architecture` domain records system-level design decisions, runtime behavior, and operational constraints that shape ChatBot-Oficial. It focuses on AI execution paths, latency/fail-safe requirements, framework boundaries, and dated architectural state. Domain scope is defined in `context.md`.

## Topic Map

### ai_runtime
See `ai_runtime/_index.md`, with drill-downs to `agent_framework_decision_for_realtime_flow.md` and `byterover_global_mode_cwd_requirement.md`.

- Core architectural decision: customer-facing realtime AI runs through a custom, deterministic path centered on `callDirectAI()`, not heavy agent orchestration frameworks.
- Realtime execution pattern is:
  `incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`
- Platform context preserved in this topic:
  - multi-tenant WhatsApp SaaS
  - Next.js-based application
  - internal serverless pipeline with 13 nodes
- `callDirectAI()` is the normalized runtime layer and owns:
  - provider access
  - Vault-based per-client credential resolution
  - budget enforcement
  - usage tracking
  - tool-call normalization
  - agent/config overrides via `getClientConfig()`
- Runtime override dimensions explicitly referenced:
  - `prompt`
  - `provider`
  - `model`
  - feature flags: `enableTools`, `enableRAG`, `enableHumanHandoff`
- Realtime design constraints:
  - hot path must be predictable and fail-safe
  - latency matters for WhatsApp atendimento flows
  - tool use must be explicitly bounded and deterministic
  - example bounded tools: `transferir_atendimento`, `buscar_documento`
- Framework boundary decision:
  - heavy agent frameworks such as Deep Agents are not suitable as the core runtime for realtime customer-service flows
  - they remain acceptable for async modules, internal automations, and backoffice copilots
  - LangChain is optional and secondary, especially for CRM/classification workloads
  - ADR-006 supports continued reuse of `callDirectAI()`
- Operational rule captured in `byterover_global_mode_cwd_requirement.md`:
  - ByteRover MCP runs in global mode for this repository
  - every query/retrieve and curate/store call must pass  
    `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
  - this is treated as an environment-mode requirement, not necessarily an installation fault
  - enforcement was added to `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`

### project_state
See `project_state/_index.md`, with drill-downs to `chatbot_oficial_snapshot_2026_03_31.md`, `theme_default_fallback_light_mode_2026_03_31.md`, and `commercial_deck_mobile_pdf_export_pattern.md`.

- This topic captures the dated repository/application state as of `2026-03-31`, including runtime signals, validation evidence, documentation drift, and a UI theme default change.
- `chatbot_oficial_snapshot_2026_03_31.md` is the anchor entry for current-state architecture and repo health:
  - production-active multi-tenant SaaS for WhatsApp customer service with AI
  - main stack: Next.js 16 + React 18
  - referenced ecosystem: Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest
  - runtime signal aligns with `ai_runtime`: webhook + serverless flow + `callDirectAI`
  - current engineering emphasis included:
    - Meta/WhatsApp integration work
    - coexistence contact/history sync
    - unified multi-tenant webhook
    - SMB echoes
    - Embedded Signup onboarding
    - dashboard/settings work
    - stronger logging and error handling
- Validation and drift state from `chatbot_oficial_snapshot_2026_03_31.md`:
  - tests: 3 suites / 10 tests passed
  - lint: 0 errors, 12 warnings
  - production build not fully revalidated because a later-stage `EPERM` spawn failure was treated as sandbox/environmental
  - uncommitted modified files included:
    - `AGENTS.md`
    - `CLAUDE.md`
    - `.github/copilot-instructions.md`
    - `UzzApp_Apresentacao_Comercial.html`
  - documentation drift exists between `README.md` and `package.json`
  - explicit mismatch: README says Next.js 14 while `package.json` indicates Next.js 16
- `theme_default_fallback_light_mode_2026_03_31.md` records a concrete application-level decision:
  - in `src/app/layout.tsx`, `ThemeProvider` fallback changed from `defaultTheme='dark'` to `defaultTheme='light'`
  - unchanged settings:
    - `enableSystem={false}`
    - `themes=['dark','light']`
    - `storageKey='uzzapp-theme'`
  - behavior:
    - users without stored preference default to light mode
    - persisted `uzzapp-theme` values continue to control existing users’ theme
- `commercial_deck_mobile_pdf_export_pattern.md` captures a reusable architecture/pattern adjacent to project state:
  - source artifact: `docs/UzzApp_Apresentacao_Comercial_v2.html`
  - key design choice: keep slide internals fixed at `1280x720` and scale the deck with CSS transform for mobile instead of reflowing absolutely positioned slide content
  - PDF/export reliability depends on:
    - `@media print` overrides
    - `body.export-pdf` mode
    - deterministic Puppeteer export via `scripts/export-uzzapp-commercial-pdf.js`
  - output artifact: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - result noted: 12-page PDF
  - related asset-path fixes touched:
    - `docs/Prints google`
    - `docs/ios/screenshots/auth-ipad-13in`

## Cross-Topic Relationships
- `project_state` reflects the current dated implementation state; `ai_runtime` captures the governing runtime architecture behind that state.
- The same core runtime pattern appears in both topics: webhook/serverless flow feeding `callDirectAI()`.
- `ai_runtime` defines the strategic boundary between deterministic realtime execution and optional async/heavier agent tooling; `project_state` shows that this boundary is still active as of `2026-03-31`.
- Repository operational constraints and repo-health facts intersect both topics:
  - ByteRover CWD/global-mode rule from `byterover_global_mode_cwd_requirement.md`
  - README/package drift and validation evidence from `chatbot_oficial_snapshot_2026_03_31.md`

## Drill-Down Order
1. Read `ai_runtime/_index.md` for the core runtime decision model.
2. Read `project_state/_index.md` for the dated repository/application snapshot.
3. Drill into:
   - `agent_framework_decision_for_realtime_flow.md` for the `callDirectAI()` vs agent-framework decision
   - `byterover_global_mode_cwd_requirement.md` for tooling constraints
   - `chatbot_oficial_snapshot_2026_03_31.md` for repo health and architecture evidence
   - `theme_default_fallback_light_mode_2026_03_31.md` for the UI fallback change
   - `commercial_deck_mobile_pdf_export_pattern.md` for the fixed-canvas + print-safe export pattern