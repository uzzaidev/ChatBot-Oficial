---
children_hash: c9076adbaa279aedf02bd9d8d7b0f17c160196f7d7a4580f99089ae64ff6cc22
compression_ratio: 0.8713290194126431
condensation_order: 2
covers: [context.md, project/_index.md]
covers_token_total: 4018
summary_level: d2
token_count: 3501
type: summary
---
# Facts Domain Structural Summary

## Domain purpose
`context.md` defines `facts` as the repository’s durable factual layer: project-wide metadata, environment constraints, operational observations, and stable workflow facts that do not belong in narrower implementation topics.

## Main topic: `project`
`project/_index.md` groups the repository facts into three major clusters:
1. ByteRover/repository operating constraints
2. ChatBot-Oficial current-state facts
3. UzzApp deck export and PPTX pipeline facts

---

## 1) Repository operating constraints

### Workflow and knowledge-state
- `initial_byterover_repository_sanity_check.md`
  - Records the repository workflow contract from `AGENTS.md`.
  - Key pattern: start tasks with a project-scoped ByteRover query and curate on significant completion.
  - On `2026-03-31`, the initial project-scoped query returned no prior curated knowledge for this cwd.

### Required ByteRover execution context
- `byterover_cwd_requirement_for_repository.md`
  - All ByteRover MCP calls for this repo must use:
    `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial`
  - Reason: ByteRover MCP runs in global mode in this environment.

### Relationship
These two entries establish the stable operational contract for working inside this repository. They are the drill-down sources for environment-specific workflow requirements.

---

## 2) ChatBot-Oficial project state facts

### Product and stack snapshot
- `chatbot_oficial_state_facts_2026_03_31.md`
  - ChatBot-Oficial is a multi-tenant SaaS for WhatsApp customer service with AI.
  - Apparent stack: `Next.js 16`, `React 18`.
  - Major dependencies: `Supabase`, `Stripe`, `Redis`, `AI SDK/OpenAI/Groq`, `Capacitor`, `Jest`.

### Validation and documentation state
- Same entry records:
  - Local test status: `3 suites`, `10 tests` passed.
  - Lint: `12 warnings`, no errors.
  - Documentation drift: `README.md` says `Next.js 14`, while `package.json` indicates `Next.js 16`.
  - Production build was not fully revalidated outside sandbox; `EPERM spawn` was treated as environment-related.

### Recent repository emphasis
- Also in `chatbot_oficial_state_facts_2026_03_31.md`
  - Recent work concentrated on Meta/WhatsApp integration:
    - coexistence sync
    - unified multi-tenant webhook
    - SMB echoes
    - Embedded Signup
    - dashboard/settings work
    - improved logging and error handling

### Theme behavior fact
- `theme_fallback_default_light_2026_03_31.md`
  - Default fallback theme is `light`.
  - Applied when no persisted preference exists.
  - Storage key: `uzzapp-theme`.
  - System theme auto-detection is disabled.
  - Source relationship: derived from `src/app/layout.tsx`.

### Relationship
These entries together define the repo-wide factual baseline: product identity, dependency stack, validation status, doc drift, and a stable UI configuration rule.

---

## 3) UzzApp HTML/PDF export evolution

This cluster documents a clear architectural progression for `docs/UzzApp apresentacao Luis/*`: from print-oriented PDF export, to live HTML export with selectable text, to export-only hybrid stabilization.

### Initial commercial PDF export baseline
- `commercial_deck_export_facts_2026_03_31.md`
  - Source: `docs/UzzApp_Apresentacao_Comercial_v2.html`
  - Script: `scripts/export-uzzapp-commercial-pdf.js`
  - Output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - Fixed geometry: `1280x720`
  - Export sequence includes:
    - viewport `1280x720`
    - `emulateMediaType("print")`
    - `document.fonts.ready`
    - `body.export-pdf`
    - `page.pdf({ preferCSSPageSize: true })`
  - Output: `12 pages`
  - Asset corrections pointed to:
    - `docs/Prints google`
    - `docs/ios/screenshots/auth-ipad-13in`

### Shift to live HTML PDF
- `uzzapp_deck_export_facts_2026_04_02.md`
  - Architectural decision: reject screenshot-based export in favor of original HTML rendered by Puppeteer.
  - Source: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html`
  - Script: `scripts/export-uzzapp-luis-pdf.js`
  - Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf`
  - Preserved rules:
    - viewport `1280x720`
    - wait for `document.fonts.ready`
    - `emulateMediaType('screen')`
    - export-only CSS with `@page` size `1280x720`, zero margins, exact color print, fixed slide dimensions, page breaks
  - Validation:
    - `12 pages`
    - `pdf-parse textLength 8043`
    - contains `UzzApp`
  - Key decision: avoid `export-pdf` flattening when visual fidelity and selectable text are both required.

### Live HTML vs image PDF comparison
- `uzzapp_deck_comparison_export_facts_2026_04_02.md`
  - Comparison script: `scripts/export-uzzapp-luis-image-pdf.js`
  - Image outputs stored in:
    `docs/UzzApp apresentacao Luis/output/image-pdf-slides`
  - Compared files:
    - `UzzApp_Apresentacao_Comercial_v2.live-html.pdf`: `12 pages`, `textLength 8043`, contains `UzzApp`
    - `UzzApp_Apresentacao_Comercial_v2.image.pdf`: `12 pages`, `textLength 24`, does not contain `UzzApp`
  - Diagnostic rule:
    - if live HTML looks bad on mobile but image PDF looks correct, likely cause is mobile PDF viewer compatibility rather than missing assets.

### Relationship
These three entries define the baseline export decision tree:
- print-mode PDF hardening was the starting point,
- live HTML became the preferred fidelity/text-preserving approach,
- image PDF remained a comparison and diagnostic fallback.

---

## 4) PDF-safe and export-only hybrid refinement

This subcluster captures iterative stabilization strategies for keeping branded visuals intact while preserving extractable text.

### Dedicated PDF-safe variant
- `uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md`
  - Added cloned source:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.html`
  - Outputs:
    - `..._pdfsafe.live-html.pdf`
    - `..._pdfsafe.image.pdf`
  - Both: `12 pages`
  - Live HTML remained extractable: `textLength 8214`, contains `UzzApp`
  - Stabilization methods:
    - gradient text -> inline SVG after `document.fonts.ready`
    - glow pseudo-elements -> SVG `background-image` data URIs
    - backdrop-blur surfaces -> static glass-card / glass-pill styles
    - extended exact color print rules

### Export-only hybrid becomes preferred pattern
- `uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md`
  - Decision: export-time transformation is preferable to permanently modifying author-facing HTML.
  - Script: `scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js`
  - Output:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf`
  - Behavior:
    - inject export-only CSS
    - flatten unstable surfaces only during export
    - perform in-page SVG upgrades
  - Validation:
    - `12 pages`
    - extractable text
    - `textLength 8214`
    - contains `UzzApp`
  - Related package command:
    `export:uzzapp-luis-exportonly-hybrid-pdf`

### Minimal override refinement
- `uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md`
  - Refines hybrid strategy by preserving original styling for stable components:
    - stat pills
    - cards
    - integration cards
    - CTA buttons
  - Only fragile constructs are stabilized:
    - gradient text
    - blur/backdrop-filter overlays
    - bubble-ai surfaces
    - some mockup layers
  - Output:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-minimal.live-html.pdf`
  - Validation: `12 pages`, extractable text, `textLength 8214`

### CTA-specific export fix
- `uzzapp_deck_export_cta_light_facts_2026_04_02.md`
  - Final targeted fix for CTA background rendering in demo/pricing CTAs.
  - Export forces `.cta-btn` to solid brand green during export.
  - Puppeteer uses `deviceScaleFactor 1` instead of `2`.
  - Output:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-cta-light.live-html.pdf`
  - Validation:
    - `12 pages`
    - `textLength 8214`
    - contains `UzzApp`
    - approx. `1.41 MB`

### Relationship
The pattern evolves as:
`pdfsafe clone` -> `export-only hybrid` -> `minimal override hybrid` -> `CTA-specific targeted fix`.
The architectural preference clearly shifts toward minimal, export-time-only intervention.

---

## 5) Native editable PPTX pipeline

This cluster extends beyond PDF into editable PowerPoint generation while preserving visual fidelity and links.

### Native PPTX rebuild
- `uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md`
  - Builder:
    `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`
  - Output:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx`
  - Uses `PptxGenJS`.
  - Output properties:
    - native editable PowerPoint
    - editable text and native shapes
    - `12 slides`
  - CTA implementation:
    - native round-rect shapes
    - hyperlinks verified on slides `1`, `11`, and `12`
    - targets include WhatsApp, site, and email
  - Validation/environment facts:
    - PowerPoint COM export is the practical validation path on Windows
    - `soffice` is unavailable
    - visual PNG render validation is source of truth
    - slide 10 warning checks skipped because native table bounds are misreported
  - Embedded commercial values:
    - monthly `R$ 247,00`
    - setup `R$ 1.000,00`
    - annual `R$ 2.727`

### Native gradient post-processing pipeline
- `uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md`
  - Pipeline components:
    - builder: `build-uzzapp-ppt.js`
    - postprocessor: `postprocess-native-gradients.py`
    - runner: `rebuild-native-gradients.ps1`
  - Artifacts:
    - base PPTX: `UzzApp_Apresentacao_Comercial_v2_editable_native.pptx`
    - postprocessed PPTX: `UzzApp_Apresentacao_Comercial_v2_editable_native_gradients.pptx`
  - Flow:
    - build with `PptxGenJS`
    - reopen with `python-pptx`
    - apply native gradients to selected shapes
    - save
    - verify gradients and hyperlinks
  - Goal:
    - replace layered gradient approximations with native gradients while preserving clickable CTAs
  - Environment constraint:
    - `python-pptx` exposes only `2` gradient stops
    - convention: use two-stop gradients, do not insert/remove stops
  - Stable shape targeting:
    - `bg_canvas_s1` through `bg_canvas_s12`
    - `cta_demo_s1`
    - `cta_sales_s11`
    - `cta_sales_s12`
    - `plan_anual_s11`
  - Gradient specs:
    - background angle `145`, `0D1520 -> 162232`
    - CTA angle `0`, `1ABC9C -> 2E86AB`
    - annual plan `3D330B -> 7B650F`
  - Preserved metadata:
    - `LAYOUT_WIDE`
    - author `OpenAI Codex`
    - company `Uzz.Ai`
    - language `pt-BR`
    - fonts `Poppins`, `Inter`
    - site `https://uzzai.com.br`
    - email `mailto:contato@uzzai.com.br`
    - contact slide: `contato@uzzai.com.br`, `+55 54 99284-1942`

### HTML-background alignment refinement
- `uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md`
  - Goal: match HTML dark background more closely using a `3-stop` gradient.
  - `postprocess-native-gradients.py` rewrites `bg_canvas_s*` `gradFill gsLst` to:
    - `0D1520` at `0%`
    - `162232` at `50%`
    - `0D1A28` at `100%`
  - Because `python-pptx` still exposes only two gradient stops, ZIP/XML post-processing is used as workaround.
  - Adds `ALT_OUT` fallback when the main PPTX is locked by PowerPoint.
  - Validated artifact:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx`

### Relationship
This pipeline progresses from:
`editable native PPTX` -> `native gradient enhancement` -> `ZIP/XML-based 3-stop background correction`.
It preserves editability, clickable links, and branded visual fidelity while working around PowerPoint/tooling limitations.

---

## 6) Stable cross-entry patterns

### Durable repository patterns
- ByteRover usage is repository-scoped and cwd-sensitive.
- Environment limitations are explicitly treated as operational constraints, not assumed product defects.

### Product-level facts
- ChatBot-Oficial remains characterized as a multi-tenant WhatsApp AI SaaS.
- Repo state combines modern web stack facts with mobile/hybrid integration via `Capacitor`.

### Deck-output invariants
Across `commercial_deck_export_facts_2026_03_31.md`, `uzzapp_deck_export_facts_2026_04_02.md`, hybrid export entries, and PPTX entries:
- Standard geometry is `1280x720`.
- Outputs consistently target `12 pages` or `12 slides`.
- Selectable/extractable text is a primary success criterion for PDF variants.
- Branded fidelity focuses on gradients, glows, CTA surfaces, cards, and device/mockup rendering.

### Validation patterns
- PDF validation uses `pdf-parse` text metrics and string presence such as `UzzApp`.
- PPTX validation relies on PowerPoint COM PNG renders as the visual source of truth.
- Workarounds are central to the architecture:
  - `EPERM spawn`
  - unavailable `soffice`
  - `python-pptx` two-stop limit
  - locked PPTX output files

---

## Drill-down map

### Repository operations
- `initial_byterover_repository_sanity_check.md`
- `byterover_cwd_requirement_for_repository.md`

### Project snapshot and UI defaults
- `chatbot_oficial_state_facts_2026_03_31.md`
- `theme_fallback_default_light_2026_03_31.md`

### HTML/PDF export baseline and comparison
- `commercial_deck_export_facts_2026_03_31.md`
- `uzzapp_deck_export_facts_2026_04_02.md`
- `uzzapp_deck_comparison_export_facts_2026_04_02.md`

### Export-only hybrid refinements
- `uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md`
- `uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md`
- `uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md`
- `uzzapp_deck_export_cta_light_facts_2026_04_02.md`

### Editable PPTX and gradient pipeline
- `uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md`
- `uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md`
- `uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md`