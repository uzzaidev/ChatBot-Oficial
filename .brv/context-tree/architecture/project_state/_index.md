---
children_hash: dd42bb6d08ae140f9a27e44c3522c665c1cffa570acc4d10e4a3d3b2418c436b
compression_ratio: 0.49379982285208146
condensation_order: 1
covers: [chatbot_oficial_snapshot_2026_03_31.md, commercial_deck_mobile_pdf_export_pattern.md, context.md]
covers_token_total: 2258
summary_level: d1
token_count: 1115
type: summary
---
# project_state

## Overview
This topic captures the current dated state of the ChatBot-Oficial repository, combining platform identity, stack/version signals, validation evidence, documentation drift, and recent implementation direction. It also includes a reusable documentation/presentation delivery pattern for mobile-safe HTML slides with deterministic PDF export.

## Structural Summary

### 1) Repository snapshot and product state
Drill-down: `chatbot_oficial_snapshot_2026_03_31.md`

- As of `2026-03-31`, ChatBot-Oficial is characterized as a production-active, **multi-tenant SaaS for WhatsApp customer service with AI**.
- Core stack signals:
  - **Next.js 16**
  - **React 18**
  - **Supabase**
  - **Stripe**
  - **Redis**
  - **AI SDK / OpenAI / Groq**
  - **Capacitor**
  - **Jest**
- Architectural state is summarized as **webhook + serverless flow + `callDirectAI`**.
- Recent delivery emphasis is strongly concentrated on **Meta/WhatsApp integration**, especially:
  - coexistence contact/history sync
  - unified multi-tenant webhook
  - SMB echoes
  - Embedded Signup onboarding
  - dashboard/settings work
  - stronger logging and error handling
- Validation and repo-health signals:
  - tests passed: **3 suites / 10 tests**
  - lint: **0 errors, 12 warnings**
  - build verification was only partially confirmed because a later **EPERM spawn** issue was treated as an environment/sandbox limitation, not a confirmed product defect
- Documentation/repository drift is explicitly noted:
  - `README.md` still describes **Next.js 14**
  - `package.json` indicates **Next.js 16**
  - local uncommitted drift included files such as `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `UzzApp_Apresentacao_Comercial.html`

### 2) Commercial deck delivery pattern
Drill-down: `commercial_deck_mobile_pdf_export_pattern.md`

- Documents a reusable pattern for keeping an HTML commercial deck mobile-friendly **without breaking PDF export fidelity**.
- Primary files:
  - `docs/UzzApp_Apresentacao_Comercial_v2.html`
  - `scripts/export-uzzapp-commercial-pdf.js`
  - output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
- Core design decision:
  - keep slides at fixed **1280x720** dimensions
  - avoid reflowing internal absolute-positioned slide content
  - handle responsiveness by scaling the whole slide/deck
- Screen rendering pattern:
  - CSS variables such as `--slide-width`, `--slide-height`, and `--deck-scale`
  - `transform: scale(var(--deck-scale))`
  - negative margin compensation so the slide shrinks visually while preserving its original coordinate system
- Print/PDF rendering pattern:
  - explicit `@media print` overrides restate layout-critical properties:
    - width
    - height
    - min-height
    - max-height
    - overflow
    - position
    - `transform: none`
    - page-break behavior
  - this separation prevents overlap and PDF-reader misrendering
- Export-stability pattern:
  - use `body.export-pdf` to disable PDF-hostile effects such as glow pseudo-elements, gradient text clipping, backdrop blur, and device shadows/notches
  - Puppeteer export flow uses:
    - viewport `1280x720`
    - `emulateMediaType("print")`
    - wait for `document.fonts.ready`
    - `page.pdf({ preferCSSPageSize: true })`
- Output/result:
  - deterministic generation of a **12-page PDF**
  - broken image references were corrected to existing assets under:
    - `docs/Prints google`
    - `docs/ios/screenshots/auth-ipad-13in`

## Key Relationships

- `project_state` connects repository-level operational truth with implementation direction:
  - platform identity and stack status come from `chatbot_oficial_snapshot_2026_03_31.md`
  - a concrete documentation/export implementation pattern is preserved in `commercial_deck_mobile_pdf_export_pattern.md`
- The topic is related to:
  - `architecture/ai_runtime` for runtime and agent decision context
  - `facts/project` for repository-level factual snapshots and sanity-check records

## Patterns Preserved Across Entries

- **Date-stamped operational snapshots** are used to record current repository truth and drift.
- **Architecture summaries** emphasize high-level runtime flow rather than exhaustive implementation detail.
- **Validation status** distinguishes confirmed application behavior from environment-constrained failures.
- **Fixed-layout + scaled-screen / explicit-print override** is the key pattern for reliable HTML-to-PDF presentation export.