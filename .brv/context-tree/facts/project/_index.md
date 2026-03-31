---
children_hash: bb9673c6cdbef1882ae826cdf9e19cab334953eab050faa6c0872b6c2fd856a6
compression_ratio: 0.5207877461706784
condensation_order: 1
covers: [byterover_cwd_requirement_for_repository.md, chatbot_oficial_state_facts_2026_03_31.md, commercial_deck_export_facts_2026_03_31.md, context.md, initial_byterover_repository_sanity_check.md]
covers_token_total: 2285
summary_level: d1
token_count: 1190
type: summary
---
# Topic: project

## Overview
Project-level facts for ChatBot-Oficial center on two themes: repository workflow requirements for ByteRover usage and dated factual snapshots of the product/application state. The child entries collectively define how work should be executed in this repository, what environment assumptions apply, and what concrete project facts were true on 2026-03-31.

## Core workflow and environment requirements
- **`initial_byterover_repository_sanity_check.md`** establishes the repository operating pattern:
  - Start tasks with a project-scoped ByteRover query.
  - Curate knowledge on significant completion.
  - On **2026-03-31**, the initial project-scoped query for this cwd found **no prior curated knowledge**.
  - Source of requirement: `AGENTS.md`.
- **`byterover_cwd_requirement_for_repository.md`** adds an environment-specific execution constraint:
  - All ByteRover MCP calls for this repo must pass  
    `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`.
  - Reason: the ByteRover MCP server runs in **global mode** in this environment.
  - Operational flow: need ByteRover operation → include explicit repository cwd → execute.

## Repository/project state snapshot
- **`chatbot_oficial_state_facts_2026_03_31.md`** captures the dated repository snapshot:
  - ChatBot-Oficial is a **multi-tenant SaaS for WhatsApp customer service with AI**.
  - Main app stack: **Next.js 16 + React 18**.
  - Core dependencies called out: **Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest**.
  - Validation status:
    - Tests passed: **3 suites / 10 tests**
    - Lint: **12 warnings, no errors**
    - Production build was **not fully revalidated outside the sandbox**; an **EPERM spawn** failure was treated as an environment limitation, not app defect.
  - Documentation drift:
    - `README.md` still says **Next.js 14**
    - `package.json` indicates **Next.js 16**
  - Recent product focus emphasized **Meta/WhatsApp integration**, including:
    - coexistence sync
    - unified multi-tenant webhook
    - SMB echoes
    - Embedded Signup
    - dashboard/settings improvements
    - better logging and error handling

## Commercial deck export facts
- **`commercial_deck_export_facts_2026_03_31.md`** records a concrete documentation/export workflow for the commercial presentation:
  - Primary files:
    - `docs/UzzApp_Apresentacao_Comercial_v2.html`
    - `scripts/export-uzzapp-commercial-pdf.js`
    - `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - Structural export pattern:
    - Deck updated for **mobile-friendly viewing** and **reliable PDF export**
    - Slides use fixed **1280x720** dimensions via `--slide-width`, `--slide-height`, `--deck-scale`
    - Narrow-screen rendering uses `transform: scale(var(--deck-scale))` with negative margin compensation instead of reflowing slide internals
    - `@media print` explicitly reasserts layout/page-break sizing rules
    - `body.export-pdf` disables heavy visual effects for deterministic PDF output
  - Export implementation:
    - `scripts/export-uzzapp-commercial-pdf.js` uses **Puppeteer**
    - viewport: **1280x720**
    - calls `emulateMediaType("print")`
    - waits for `document.fonts.ready`
    - adds `body.export-pdf`
    - generates PDF with `page.pdf({ preferCSSPageSize: true })`
  - Output/result:
    - Generated file: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
    - Final PDF length: **12 pages**
  - Asset-path correction:
    - Broken image refs were repointed to:
      - `docs/Prints google`
      - `docs/ios/screenshots/auth-ipad-13in`

## Relationships across entries
- **Workflow facts** from `initial_byterover_repository_sanity_check.md` and **environment constraints** from `byterover_cwd_requirement_for_repository.md` jointly define the repository’s ByteRover operating baseline.
- **Project snapshot facts** in `chatbot_oficial_state_facts_2026_03_31.md` describe the current application/product and validation state.
- **Commercial deck export facts** in `commercial_deck_export_facts_2026_03_31.md` are a focused project artifact update that complements the broader project snapshot.
- The topic-level `context.md` frames this folder as a store of **project-level facts**, especially repository workflow requirements and reusable repository state for future ByteRover sessions.

## Drill-down map
- For repository workflow rules and first-run state: **`initial_byterover_repository_sanity_check.md`**
- For mandatory ByteRover cwd usage: **`byterover_cwd_requirement_for_repository.md`**
- For application stack, validation status, and documentation drift: **`chatbot_oficial_state_facts_2026_03_31.md`**
- For mobile/PDF commercial deck implementation details: **`commercial_deck_export_facts_2026_03_31.md`**