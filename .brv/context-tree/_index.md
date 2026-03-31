---
children_hash: f9f326f0af562c660f56ced8c828914dbd1cac97e7f604e5b00d2e0f0303d847
compression_ratio: 0.7013690815744438
condensation_order: 3
covers: [architecture/_index.md, facts/_index.md]
covers_token_total: 3506
summary_level: d3
token_count: 2459
type: summary
---
# Structural Summary

## Knowledge Surface
The provided entries split into two complementary domains:

- `architecture/_index.md` — system design, runtime decisions, and dated architectural state
- `facts/_index.md` — durable operational facts, repository constraints, and compact state snapshots

Together they describe ChatBot-Oficial as a production-active, multi-tenant WhatsApp customer-service SaaS whose current implementation and operational workflow are anchored by a deterministic AI runtime and explicit repository-handling rules.

## 1. Architecture Domain

### Primary Topics
- `ai_runtime/_index.md`
- `project_state/_index.md`

### `ai_runtime`: deterministic realtime AI path
Drill into:
- `agent_framework_decision_for_realtime_flow.md`
- `byterover_global_mode_cwd_requirement.md`

Key decision:
- Realtime customer-facing AI should run through a custom deterministic path centered on `callDirectAI()`, not a heavy agent framework.

Core runtime flow:
- `incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`

Preserved architectural facts:
- platform context includes multi-tenant WhatsApp SaaS, Next.js application, and an internal 13-node serverless pipeline
- `callDirectAI()` is the normalized runtime layer for:
  - provider access
  - Vault-based per-client credential resolution
  - budget enforcement
  - usage tracking
  - tool-call normalization
  - overrides via `getClientConfig()`

Runtime override dimensions:
- `prompt`
- `provider`
- `model`
- `enableTools`
- `enableRAG`
- `enableHumanHandoff`

Boundary decision:
- heavy agent frameworks are not suitable as the core realtime runtime
- they remain acceptable for async modules, internal automations, and backoffice copilots
- LangChain is optional/secondary
- ADR-006 supports continued reuse of `callDirectAI()`

Operational constraint captured in `byterover_global_mode_cwd_requirement.md`:
- ByteRover MCP runs in global mode
- all repository operations must pass:
  - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- rule was propagated into `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`

### `project_state`: dated architecture and repository state
Drill into:
- `chatbot_oficial_snapshot_2026_03_31.md`
- `theme_default_fallback_light_mode_2026_03_31.md`
- `commercial_deck_mobile_pdf_export_pattern.md`

#### `chatbot_oficial_snapshot_2026_03_31.md`
Anchor snapshot as of `2026-03-31`:
- app identity: production-active multi-tenant WhatsApp customer-service SaaS with AI
- main stack: `Next.js 16`, `React 18`
- referenced ecosystem: Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest
- runtime still aligns with `ai_runtime`: webhook/serverless flow feeding `callDirectAI()`

Engineering emphasis at snapshot time:
- Meta/WhatsApp integration
- coexistence contact/history sync
- unified multi-tenant webhook
- SMB echoes
- Embedded Signup onboarding
- dashboard/settings work
- stronger logging and error handling

Validation and drift:
- tests: `3 suites / 10 tests` passed
- lint: `0 errors`, `12 warnings`
- production build not fully revalidated due to later-stage sandbox/environmental `EPERM` spawn failure
- modified files included:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.github/copilot-instructions.md`
  - `UzzApp_Apresentacao_Comercial.html`
- documentation drift:
  - `README.md` says `Next.js 14`
  - `package.json` indicates `Next.js 16`

#### `theme_default_fallback_light_mode_2026_03_31.md`
Concrete UI policy change in `src/app/layout.tsx`:
- `ThemeProvider` fallback changed from `defaultTheme='dark'` to `defaultTheme='light'`

Unchanged settings:
- `enableSystem={false}`
- `themes=['dark','light']`
- `storageKey='uzzapp-theme'`

Behavioral outcome:
- users without a saved preference default to light mode
- persisted `uzzapp-theme` still overrides fallback for returning users

#### `commercial_deck_mobile_pdf_export_pattern.md`
Reusable fixed-canvas export pattern for the commercial deck:
- source: `docs/UzzApp_Apresentacao_Comercial_v2.html`
- output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
- export script: `scripts/export-uzzapp-commercial-pdf.js`

Design decision:
- keep slide internals fixed at `1280x720`
- scale the deck with CSS transform for mobile instead of reflowing absolutely positioned slide content

Export reliability depends on:
- `@media print` overrides
- `body.export-pdf`
- deterministic Puppeteer export

Recorded result:
- generated `12-page PDF`

Asset-path fixes touched:
- `docs/Prints google`
- `docs/ios/screenshots/auth-ipad-13in`

## 2. Facts Domain

### Main Topic
- `project/_index.md`

Drill into:
- `initial_byterover_repository_sanity_check.md`
- `byterover_cwd_requirement_for_repository.md`
- `chatbot_oficial_state_facts_2026_03_31.md`
- `commercial_deck_export_facts_2026_03_31.md`
- `theme_fallback_default_light_2026_03_31.md`

### `project`: operational fact layer
This topic acts as a compact recall surface for repository-level facts, workflow requirements, and dated state observations, often mirroring deeper architecture entries.

#### ByteRover repository workflow rules
From `initial_byterover_repository_sanity_check.md` and `byterover_cwd_requirement_for_repository.md`:

- on `2026-03-31`, the initial ByteRover repository check found no prior curated knowledge for this working directory
- `AGENTS.md` defines workflow conventions:
  - run a ByteRover query at task start
  - curate knowledge on significant completion
- all ByteRover MCP calls for this repository must use:
  - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- rationale: global-mode repository targeting requirement

Relationship:
- `initial_byterover_repository_sanity_check.md` explains when ByteRover should be used
- `byterover_cwd_requirement_for_repository.md` explains how targeting must be done

#### `chatbot_oficial_state_facts_2026_03_31.md`
Compact factual counterpart of the architectural snapshot:
- ChatBot-Oficial is a multi-tenant WhatsApp customer-service SaaS with AI
- main stack: `Next.js 16`, `React 18`
- notable dependencies: Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest
- evidence source files: `README.md`, `package.json`

Validation and drift:
- tests: `3 suites`, `10 tests`
- lint: no errors, `12 warnings`
- build revalidation incomplete because sandbox `EPERM spawn` was treated as environmental
- doc drift:
  - `README.md` = `Next.js 14`
  - `package.json` = `Next.js 16`

Recent development emphasis mirrors `architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md`.

#### `commercial_deck_export_facts_2026_03_31.md`
Fact-layer summary of the deck export pattern:

Artifacts:
- `docs/UzzApp_Apresentacao_Comercial_v2.html`
- `scripts/export-uzzapp-commercial-pdf.js`
- `docs/UzzApp_Apresentacao_Comercial_v2.pdf`

Mechanical facts:
- slide size fixed at `1280x720`
- CSS variables include:
  - `--slide-width`
  - `--slide-height`
  - `--deck-scale`
- mobile scaling uses `transform: scale(var(--deck-scale))`
- negative margin compensation avoids internal slide reflow

PDF-specific behavior:
- `@media print` restates dimensions, overflow, positioning, `transform: none`, and page-break behavior
- `body.export-pdf` disables effects that degrade PDF output

Puppeteer flow in `scripts/export-uzzapp-commercial-pdf.js`:
- viewport `1280x720`
- `emulateMediaType("print")`
- wait for `document.fonts.ready`
- add `body.export-pdf`
- `page.pdf({ preferCSSPageSize: true })`

Result:
- generated PDF is `12 pages`
- broken image paths corrected in:
  - `docs/Prints google`
  - `docs/ios/screenshots/auth-ipad-13in`

#### `theme_fallback_default_light_2026_03_31.md`
Fact-layer counterpart of the theme architecture note:
- default fallback theme is `light`
- applies when no saved preference exists
- persistence key is `uzzapp-theme`
- configured in `src/app/layout.tsx`
- system theme detection is disabled
- saved user preference still overrides fallback

## 3. Cross-Domain Relationships

### Architecture vs Facts
- `architecture/_index.md` captures why the system is structured the way it is
- `facts/_index.md` captures the stable operational truths and dated checkpoints derived from that structure

Direct pairings:
- `architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md`
  ↔ `facts/project/chatbot_oficial_state_facts_2026_03_31.md`
- `architecture/project_state/commercial_deck_mobile_pdf_export_pattern.md`
  ↔ `facts/project/commercial_deck_export_facts_2026_03_31.md`
- `architecture/project_state/theme_default_fallback_light_mode_2026_03_31.md`
  ↔ `facts/project/theme_fallback_default_light_2026_03_31.md`

### Stable repeated patterns
Across both domains, the same high-value patterns recur:

- deterministic runtime over heavy orchestration for realtime AI
- `callDirectAI()` as the central AI execution surface
- explicit repository targeting through:
  - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- date-stamped snapshotting for project state (`2026-03-31`)
- recognition of documentation drift and environmental validation limits
- preference for deterministic rendering/export workflows in presentation assets

## 4. Best Drill-Down Order
1. `architecture/_index.md` — top-level architectural frame
2. `ai_runtime/_index.md` — core runtime decision model
3. `project_state/_index.md` — dated application/repository state
4. `agent_framework_decision_for_realtime_flow.md` — `callDirectAI()` vs heavy agents
5. `chatbot_oficial_snapshot_2026_03_31.md` — current-state evidence and drift
6. `commercial_deck_mobile_pdf_export_pattern.md` — fixed-canvas mobile/PDF export strategy
7. `theme_default_fallback_light_mode_2026_03_31.md` — UI fallback policy
8. `facts/_index.md` and `project/_index.md` — compact recall layer for the same decisions and state