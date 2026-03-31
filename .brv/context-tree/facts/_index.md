---
children_hash: 76577d6de27074c8ba06b558adfd08814883e34fa5ba98c34d77cc8c72763eb8
compression_ratio: 0.7970602181128497
condensation_order: 2
covers: [context.md, project/_index.md]
covers_token_total: 2109
summary_level: d2
token_count: 1681
type: summary
---
# Facts Domain Structural Summary

## Domain Purpose
`facts` stores durable repository-level knowledge that is factual, operational, and broadly applicable across the project, rather than implementation-deep architecture. It is owned by repository maintainers and is intended for concise project metadata, environment constraints, and knowledge-state observations.

## Main Topic: `project`
The `project` topic aggregates ChatBot-Oficial repository facts, workflow constraints, dated state snapshots, and point-in-time operational decisions. For details, drill into:
- `initial_byterover_repository_sanity_check.md`
- `byterover_cwd_requirement_for_repository.md`
- `chatbot_oficial_state_facts_2026_03_31.md`
- `commercial_deck_export_facts_2026_03_31.md`
- `theme_fallback_default_light_2026_03_31.md`

## Core Knowledge Clusters

### 1. ByteRover workflow requirements
Two entries define repository interaction rules for ByteRover:

- `initial_byterover_repository_sanity_check.md`
  - On `2026-03-31`, the first repository-scoped ByteRover check found no prior curated knowledge for this working directory.
  - `AGENTS.md` defines durable workflow conventions:
    - run a ByteRover query at task start
    - curate knowledge on significant completion

- `byterover_cwd_requirement_for_repository.md`
  - All ByteRover MCP calls for this repository must use:
    - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
  - Reason: ByteRover MCP runs in global mode here.
  - Practical flow: target repository explicitly with `cwd` before any operation.

Relationship:
- `initial_byterover_repository_sanity_check.md` explains when ByteRover should be used.
- `byterover_cwd_requirement_for_repository.md` explains how repository targeting must be done correctly.

### 2. Dated project state snapshot
`chatbot_oficial_state_facts_2026_03_31.md` captures a compact factual snapshot of the app as of `2026-03-31`.

Key facts:
- ChatBot-Oficial is a multi-tenant SaaS focused on WhatsApp customer service with AI.
- Main stack:
  - `Next.js 16`
  - `React 18`
- Notable dependencies:
  - Supabase
  - Stripe
  - Redis
  - AI SDK / OpenAI / Groq
  - Capacitor
  - Jest
- Evidence sources:
  - `README.md`
  - `package.json`

Validation/documentation status:
- tests passed: `3 suites`, `10 tests`
- lint: no errors, `12 warnings`
- documentation drift exists:
  - `README.md` says `Next.js 14`
  - `package.json` shows `Next.js 16`
- production build was not fully revalidated outside sandbox because sandbox `EPERM spawn` was treated as environmental, not app-defect evidence

Recent development emphasis:
- Meta/WhatsApp-heavy work including coexistence sync, unified multi-tenant webhook, SMB echoes, Embedded Signup, dashboard/settings, logging, and error handling.

Relationship:
- This is the fact-layer summary of `architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md`.

### 3. Commercial deck export facts
`commercial_deck_export_facts_2026_03_31.md` records a deterministic HTML-to-PDF export flow for the commercial presentation deck.

Primary artifacts:
- `docs/UzzApp_Apresentacao_Comercial_v2.html`
- `scripts/export-uzzapp-commercial-pdf.js`
- `docs/UzzApp_Apresentacao_Comercial_v2.pdf`

Structural/rendering facts:
- slide size is fixed at `1280x720`
- CSS variables include:
  - `--slide-width`
  - `--slide-height`
  - `--deck-scale`
- mobile behavior uses `transform: scale(var(--deck-scale))`
- negative margin compensation prevents internal slide reflow on narrow screens

PDF/export behavior:
- `@media print` restates width, height, min/max height, overflow, positioning, `transform: none`, and page-break behavior
- `body.export-pdf` disables PDF-problematic visual effects such as glow pseudo-elements, gradient text clipping, backdrop blur, shadows/notches, and transparency-heavy effects

Export script behavior:
- Puppeteer workflow in `scripts/export-uzzapp-commercial-pdf.js` includes:
  - viewport `1280x720`
  - `emulateMediaType("print")`
  - wait for `document.fonts.ready`
  - add `body.export-pdf`
  - `page.pdf({ preferCSSPageSize: true })`

Output corrections:
- generated PDF is `12 pages`
- broken image paths were fixed under:
  - `docs/Prints google`
  - `docs/ios/screenshots/auth-ipad-13in`

Relationship:
- This entry is the fact-layer companion to `architecture/project_state/commercial_deck_mobile_pdf_export_pattern.md`.

### 4. Theme fallback policy
`theme_fallback_default_light_2026_03_31.md` captures the current default theme behavior.

Key facts:
- default fallback theme is `light`
- applies when no saved preference exists
- storage key is `uzzapp-theme`
- system theme auto-detection is disabled
- configured in `src/app/layout.tsx`

Behavioral rule:
- persisted user preference still overrides the fallback
- impact is mainly on first-load and reset-state sessions

Relationship:
- This is the factual counterpart of `architecture/project_state/theme_default_fallback_light_mode_2026_03_31.md`.

## Cross-Entry Patterns

### Repository facts are operational and environment-specific
The topic mixes project facts with execution constraints:
- workflow trigger rules from `AGENTS.md`
- repository targeting requirement via explicit `cwd`

### Facts are date-stamped snapshots
Several entries are intentionally point-in-time:
- `chatbot_oficial_state_facts_2026_03_31.md`
- `commercial_deck_export_facts_2026_03_31.md`
- `theme_fallback_default_light_2026_03_31.md`

### Facts frequently summarize deeper architecture entries
The `facts/project` layer acts as a compact recall surface pointing to deeper architecture documentation in:
- `architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md`
- `architecture/project_state/commercial_deck_mobile_pdf_export_pattern.md`
- `architecture/project_state/theme_default_fallback_light_mode_2026_03_31.md`

### Coverage spans workflow, code, and assets
Referenced sources span:
- workflow/config: `AGENTS.md`
- app/runtime files: `src/app/layout.tsx`, `README.md`, `package.json`
- content/export assets: `docs/UzzApp_Apresentacao_Comercial_v2.html`, `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
- automation script: `scripts/export-uzzapp-commercial-pdf.js`

## Drill-Down Guide
- `initial_byterover_repository_sanity_check.md` — initial knowledge-state and repository workflow conventions
- `byterover_cwd_requirement_for_repository.md` — mandatory repository `cwd` targeting rule
- `chatbot_oficial_state_facts_2026_03_31.md` — platform identity, stack, validation state, and doc drift
- `commercial_deck_export_facts_2026_03_31.md` — deck dimensions, PDF export mechanics, Puppeteer flow, output fixes
- `theme_fallback_default_light_2026_03_31.md` — theme fallback behavior and persistence rule