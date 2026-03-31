---
children_hash: e04a11b79c75840d93314c4cf77d71dbf96481ce11040018bb491c86be022edf
compression_ratio: 0.3326157158234661
condensation_order: 1
covers: [chatbot_oficial_snapshot_2026_03_31.md, commercial_deck_mobile_pdf_export_pattern.md, context.md, theme_default_fallback_light_mode_2026_03_31.md]
covers_token_total: 2787
summary_level: d1
token_count: 927
type: summary
---
# project_state

## Overview
This topic captures the dated operational state of ChatBot-Oficial as of 2026-03-31: repository snapshot, architecture/runtime signals, validation evidence, documentation drift, and a UI default-theme change. For reusable presentation/export behavior, see `commercial_deck_mobile_pdf_export_pattern`.

## Core Project Snapshot
From `chatbot_oficial_snapshot_2026_03_31`:

- ChatBot-Oficial is a production-active, multi-tenant SaaS for WhatsApp customer service with AI.
- Main stack: Next.js 16 + React 18.
- Referenced dependencies include Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, and Jest.
- Architecture signal at snapshot time: webhook + serverless flow + `callDirectAI`.
- Recent product and engineering focus centered on Meta/WhatsApp integration:
  - coexistence contact/history sync
  - unified multi-tenant webhook
  - SMB echoes
  - Embedded Signup onboarding
  - dashboard/settings work
  - stronger logging and error handling

## Validation and Repository Health
From `chatbot_oficial_snapshot_2026_03_31`:

- Local validation evidence:
  - tests passed: 3 suites / 10 tests
  - lint passed with 0 errors and 12 warnings
- Build verification was only partially confirmed:
  - later-stage `EPERM` spawn failure was treated as sandbox/environmental, not product failure
  - production build was not fully revalidated outside sandbox constraints
- Repository hygiene/drift noted:
  - uncommitted modified files included `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `UzzApp_Apresentacao_Comercial.html`
  - documentation drift exists between `README.md` and `package.json`
  - key mismatch: README still says Next.js 14 while `package.json` indicates Next.js 16

## Theme Fallback Decision
From `theme_default_fallback_light_mode_2026_03_31`:

- Global theme configuration in `src/app/layout.tsx` changed `ThemeProvider` fallback from `defaultTheme='dark'` to `defaultTheme='light'`.
- Preserved settings:
  - `enableSystem={false}`
  - `themes=['dark','light']`
  - `storageKey='uzzapp-theme'`
- Behavioral effect:
  - users without saved preference now open in light mode
  - users with persisted `uzzapp-theme` values keep their existing dark/light selection

## Reusable Presentation / Export Pattern
From `commercial_deck_mobile_pdf_export_pattern`:

- A separate but related implementation pattern documents how `docs/UzzApp_Apresentacao_Comercial_v2.html` was made mobile-friendly without breaking PDF fidelity.
- Key architectural choice:
  - keep slide internals at fixed `1280x720`
  - scale the deck for screen viewing with CSS transform, rather than reflowing absolutely positioned content
- Export reliability is achieved by:
  - explicit `@media print` overrides for dimensions, overflow, position, `transform:none`, and page-break behavior
  - `body.export-pdf` mode to disable PDF-hostile effects
  - deterministic Puppeteer export in `scripts/export-uzzapp-commercial-pdf.js`
- Output/result:
  - generated `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - 12 pages
- Asset-path repairs referenced:
  - `docs/Prints google`
  - `docs/ios/screenshots/auth-ipad-13in`

## Relationships
- `chatbot_oficial_snapshot_2026_03_31` is the broad repository/state anchor.
- `theme_default_fallback_light_mode_2026_03_31` is a specific application-level state change within that snapshot.
- `commercial_deck_mobile_pdf_export_pattern` captures a reusable implementation pattern adjacent to current project state, especially around docs/export workflow.
- Related drill-downs:
  - `architecture/ai_runtime/context.md` for runtime and agent decisions
  - `facts/project/*` for normalized repository facts and operational assertions