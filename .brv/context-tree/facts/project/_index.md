---
children_hash: 7cc380995a0d69cb6626e9a504ff57467ed4eb42e03c25961a152c401ad71aeb
compression_ratio: 0.7031070195627158
condensation_order: 1
covers: [byterover_cwd_requirement_for_repository.md, chatbot_oficial_state_facts_2026_03_31.md, commercial_deck_export_facts_2026_03_31.md, context.md, initial_byterover_repository_sanity_check.md, theme_fallback_default_light_2026_03_31.md]
covers_token_total: 2607
summary_level: d1
token_count: 1833
type: summary
---
# Project Facts Overview

This topic consolidates repository-level operational facts, current application state, and point-in-time project facts for ChatBot-Oficial. It centers on ByteRover workflow requirements, dated repository validation facts, a commercial deck export update, and the current theme fallback policy.

## Core Topic Scope
From `context.md`, the `facts/project` topic is intended to capture:
- project-level facts for ChatBot-Oficial
- current knowledge-state and repository workflow requirements
- reusable repository-scoped conventions relevant to future ByteRover sessions

Related drill-down area:
- broader workflow/process conventions may also connect to `facts/conventions`

## ByteRover Workflow and Environment Requirements

### Repository startup and curation rules
From `initial_byterover_repository_sanity_check.md`:
- On `2026-03-31`, the initial project-scoped ByteRover query for this repository returned no prior curated knowledge for the current working directory.
- `AGENTS.md` establishes two durable workflow requirements:
  - run a ByteRover query at task start
  - curate knowledge on significant completion

This entry is both:
- a point-in-time observation about knowledge-base emptiness on first check
- a durable repository convention source for future sessions

### Mandatory cwd for repository targeting
From `byterover_cwd_requirement_for_repository.md`:
- All ByteRover MCP calls for ChatBot-Oficial must pass:
  - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- Reason:
  - the ByteRover MCP server runs in global mode in this environment
- Operational flow:
  - need ByteRover operation -> include explicit repository cwd -> execute operation

Relationship:
- `initial_byterover_repository_sanity_check.md` defines when ByteRover should be used
- `byterover_cwd_requirement_for_repository.md` defines how ByteRover must be targeted correctly in this environment

## Dated Repository State Snapshot Facts

From `chatbot_oficial_state_facts_2026_03_31.md`:
- Project identity:
  - ChatBot-Oficial is a multi-tenant SaaS for WhatsApp customer service with AI
- Main stack:
  - `Next.js 16`
  - `React 18`
- Core dependencies highlighted:
  - Supabase
  - Stripe
  - Redis
  - AI SDK / OpenAI / Groq
  - Capacitor
  - Jest
- Evidence sources:
  - `README.md`
  - `package.json`

### Validation and documentation state
Key factual status recorded on `2026-03-31`:
- tests passed:
  - 3 suites
  - 10 tests
- lint status:
  - completed with no errors
  - 12 warnings
- documentation drift exists:
  - `README.md` still describes `Next.js 14`
  - `package.json` indicates `Next.js 16`
- build verification caveat:
  - production build was not fully revalidated outside sandbox
  - sandbox `EPERM spawn` failure was treated as environmental, not application-defect evidence

### Recent development focus
Recent work emphasis was Meta/WhatsApp-heavy, including:
- coexistence sync
- unified multi-tenant webhook
- SMB echoes
- Embedded Signup
- dashboard/settings
- improved logging and error handling

Relationship:
- This file is the compact fact layer for the broader architectural snapshot in `architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md`

## Commercial Deck Export Facts

From `commercial_deck_export_facts_2026_03_31.md`, the project now has a documented, deterministic HTML-to-PDF deck export flow.

### Primary files
- `docs/UzzApp_Apresentacao_Comercial_v2.html`
- `scripts/export-uzzapp-commercial-pdf.js`
- `docs/UzzApp_Apresentacao_Comercial_v2.pdf`

### Layout and rendering model
Key structural facts:
- slides use fixed `1280x720` dimensions
- CSS variables include:
  - `--slide-width`
  - `--slide-height`
  - `--deck-scale`
- mobile viewing pattern:
  - slides are scaled with `transform: scale(var(--deck-scale))`
  - negative margin compensation avoids reflow of slide internals on narrow screens

### PDF-specific export pattern
PDF/export behavior includes:
- `@media print` explicitly restates width/height/min-height/max-height/overflow/position/`transform:none`/page-break rules
- `body.export-pdf` disables visual effects that are problematic for PDF output, including:
  - glow pseudo-elements
  - gradient text clipping
  - backdrop blur
  - device shadows/notches
  - other transparency-heavy effects

### Export script behavior
`scripts/export-uzzapp-commercial-pdf.js` uses Puppeteer with:
- viewport `1280x720`
- `emulateMediaType("print")`
- wait for `document.fonts.ready`
- add `body.export-pdf`
- call `page.pdf({ preferCSSPageSize: true })`

### Output and asset corrections
- generated PDF:
  - `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - `12 pages`
- broken image paths were corrected to assets under:
  - `docs/Prints google`
  - `docs/ios/screenshots/auth-ipad-13in`

Relationship:
- This file captures the fact layer for the design/implementation summary in `architecture/project_state/commercial_deck_mobile_pdf_export_pattern.md`

## Theme Fallback Policy

From `theme_fallback_default_light_2026_03_31.md`:
- current default theme fallback is `light`
- applies when no saved preference exists
- storage key:
  - `uzzapp-theme`
- system theme auto-detection is disabled
- configured in:
  - `src/app/layout.tsx`

Behavioral relationship:
- persisted user preference still wins
- the change mainly affects first-load or reset-state sessions

Related drill-down:
- broader architectural reasoning is linked through `architecture/project_state/theme_default_fallback_light_mode_2026_03_31.md`

## Cross-Entry Patterns

Across these entries, the topic shows four recurring patterns:

- **Repository operational rules are explicit and environment-specific**
  - startup query and completion curation from `initial_byterover_repository_sanity_check.md`
  - mandatory explicit `cwd` from `byterover_cwd_requirement_for_repository.md`

- **Project facts are date-stamped snapshots**
  - repository state, validation status, and active product focus in `chatbot_oficial_state_facts_2026_03_31.md`
  - UI/theme behavior in `theme_fallback_default_light_2026_03_31.md`

- **Facts often summarize broader architectural entries**
  - project snapshot facts point to `architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md`
  - commercial deck export facts point to `architecture/project_state/commercial_deck_mobile_pdf_export_pattern.md`
  - theme fallback facts point to `architecture/project_state/theme_default_fallback_light_mode_2026_03_31.md`

- **Operational knowledge spans both code and workflow**
  - code/config files: `src/app/layout.tsx`, `README.md`, `package.json`
  - content/export assets: `docs/UzzApp_Apresentacao_Comercial_v2.html`, `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - process/rules source: `AGENTS.md`

## Drill-Down Map

Use these entries for details:
- `initial_byterover_repository_sanity_check.md` — initial knowledge-state observation and ByteRover workflow rules
- `byterover_cwd_requirement_for_repository.md` — required explicit repository `cwd`
- `chatbot_oficial_state_facts_2026_03_31.md` — dated platform, stack, validation, and documentation-drift facts
- `commercial_deck_export_facts_2026_03_31.md` — deck layout, Puppeteer export sequence, and PDF output facts
- `theme_fallback_default_light_2026_03_31.md` — current light-mode fallback and theme storage behavior