---
children_hash: 2e70e5073ca22cc9e29707e5fb20b5d17921ea2f3beb19854ec097caa9e56f47
compression_ratio: 0.2593617021276596
condensation_order: 1
covers: [chatbot_oficial_snapshot_2026_03_31.md, commercial_deck_mobile_pdf_export_pattern.md, context.md, theme_default_fallback_light_mode_2026_03_31.md, uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md, uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md, uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md, uzzapp_deck_html_pdf_export_pattern_2026_04_02.md, uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md, uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md, uzzapp_native_gradient_html_background_alignment_2026_04_05.md, uzzapp_native_gradient_pptx_pipeline_2026_04_05.md, uzzapp_openai_slides_skill_pptx_rebuild.md, uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md]
covers_token_total: 14100
summary_level: d1
token_count: 3657
type: summary
---
# project_state

## Overview
This topic captures dated repository-state and presentation-delivery decisions for ChatBot-Oficial, centered on two threads:
1. the overall app/repo snapshot in `chatbot_oficial_snapshot_2026_03_31.md` and `theme_default_fallback_light_mode_2026_03_31.md`
2. the evolving UzzApp commercial deck export/rebuild pipeline across HTML PDF, PDF-safe variants, export-only mutations, and native PPTX generation from `commercial_deck_mobile_pdf_export_pattern.md` through the 2026-04-05 PPTX entries.

For runtime and agent decisions, drill into `architecture/ai_runtime/*`. For normalized project facts, drill into `facts/project/*`.

## Repository and product state

### `chatbot_oficial_snapshot_2026_03_31.md`
- ChatBot-Oficial is a production-active **multi-tenant SaaS for WhatsApp customer service with AI**.
- Main stack: **Next.js 16**, **React 18**, Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest.
- The snapshot identifies a **documentation drift**: `README.md` still describes **Next.js 14** while `package.json` indicates **Next.js 16`.
- Recent delivery emphasis is **Meta/WhatsApp integration**, especially:
  - coexistence contact/history sync
  - unified multi-tenant webhook
  - SMB echoes
  - Embedded Signup onboarding
  - dashboard/settings work
  - stronger logging/error handling
- Local validation state:
  - tests passed: **3 suites / 10 tests**
  - lint: **0 errors, 12 warnings**
  - build EPERM failure treated as **environmental/sandbox-related**, not a confirmed app defect
- Modified but uncommitted examples include `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `UzzApp_Apresentacao_Comercial.html`.

### `theme_default_fallback_light_mode_2026_03_31.md`
- Global theme config in `src/app/layout.tsx` changed **ThemeProvider defaultTheme** from `'dark'` to `'light'`.
- Preserved configuration:
  - `enableSystem={false}`
  - `themes=['dark','light']`
  - `storageKey='uzzapp-theme'`
- Result: first-time or reset users default to **light mode**; persisted user preference still wins.

## UzzApp HTML/PDF deck export patterns

### Baseline fixed-slide + print-safe pattern
#### `commercial_deck_mobile_pdf_export_pattern.md`
- Establishes a reusable pattern for `docs/UzzApp_Apresentacao_Comercial_v2.html`.
- Core decision: keep slides at fixed **1280x720** and scale the deck on screen via CSS variables and `transform: scale(var(--deck-scale))` rather than reflow slide internals.
- PDF safety is handled with explicit `@media print` overrides:
  - restate width/height/min-height/max-height
  - `overflow`
  - `position`
  - `transform:none`
  - page-break rules
- Introduces `body.export-pdf` to disable unstable effects during export:
  - glow pseudo-elements
  - gradient text clipping
  - backdrop blur
  - device shadows/notches
  - other transparency-heavy effects
- Export implementation: `scripts/export-uzzapp-commercial-pdf.js`
  - Puppeteer viewport `1280x720`
  - `emulateMediaType("print")`
  - wait for `document.fonts.ready`
  - `page.pdf({ preferCSSPageSize: true })`
- Output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf` with **12 pages**.

### Live HTML PDF fidelity pattern
#### `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md`
- Replaces a rejected **screenshot-based PDF** approach.
- Preferred rule for fidelity-sensitive exports: preserve **live selectable text** and exact visuals by exporting original HTML with Puppeteer in **screen media**.
- Export script: `scripts/export-uzzapp-luis-pdf.js`
  - opens `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html`
  - viewport `1280x720`
  - waits for `document.fonts.ready`
  - calls `emulateMediaType('screen')`
  - injects export-only CSS enforcing `@page 1280x720`, zero margins, exact color printing, fixed slide dimensions, page breaks
- Important rule: **do not** add an export mode that flattens gradients/glows/device details when exact fidelity and text selection are required.
- Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf`
  - **12 pages**
  - pdf-parse `textLength 8043`
  - contains `"UzzApp"` => confirms text-extractable PDF

### Diagnostic comparison: live HTML vs image PDF
#### `uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md`
- Adds a second export path to compare viewer behavior:
  - live HTML PDF: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.live-html.pdf`
  - image PDF: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.image.pdf`
- Image export script: `scripts/export-uzzapp-luis-image-pdf.js`
  - renders each slide in single-slide mode
  - captures screenshots at `1280x720` via `Page.screenshot()`
  - stores PNGs in `docs/UzzApp apresentacao Luis/output/image-pdf-slides`
  - assembles image-based PDF
- Diagnostic pattern:
  - live-html PDF: **12 pages**, `textLength 8043`, contains `UzzApp`
  - image PDF: **12 pages**, `textLength 24`, no `UzzApp`
- Key interpretation: if live-html PDF breaks on mobile but image PDF looks correct, the issue is likely **mobile PDF viewer compatibility with live PDF constructs**, not missing deck assets.

## Export-only hybrid PDF strategy

### Initial preferred export-only transformation
#### `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md`
- Establishes the reusable preferred pattern: keep author-facing marketing HTML intact and apply **PDF-safe CSS/DOM mutations only during Puppeteer export**.
- Script: `scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js`
- Added `package.json` script: `export:uzzapp-luis-exportonly-hybrid-pdf`
- Export-time mutations include converting:
  - gradient text to inline SVG
  - CTA backgrounds to inline SVG
  - flattening unstable surfaces like cards, stat pills, integration cards, device screens, browser frames, bubble-ai elements, blur-heavy overlays
- Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf`
  - **12 pages**
  - extractable text, `textLength 8214`
  - contains `UzzApp`

### Refined minimal-override variant
#### `uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md`
- Records that the first export-only hybrid pass was **too aggressive** and degraded visual quality.
- Refinement: preserve original HTML styling for stable elements and stabilize only truly fragile layers.
- Preserve live styling for:
  - normal cards
  - stat pills
  - integration cards
  - CTA buttons
- Restrict stabilization to:
  - gradient text
  - blur/backdrop-filter overlays
  - bubble-ai surfaces
  - selected device/browser mockup layers
- Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-minimal.live-html.pdf`
  - **12 pages**
  - pdf-parse `textLength 8214`
  - contains `UzzApp`

### CTA-light refinement
#### `uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md`
- Further refinement after minimal override:
  - during export only, force `.cta-btn` to a **solid brand green** background
  - remove unstable CTA gradient rendering
  - reduce Puppeteer `deviceScaleFactor` from **2** to **1** to lower file weight
- Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-cta-light.live-html.pdf`
  - **12 pages**
  - `textLength 8214`
  - contains `UzzApp`
  - size about **1.41 MB**, slightly lighter than the previous ~**1.43 MB**

## PDF-safe framework variant

### `uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md`
- Describes an experimental cloned HTML variant: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.html`
- Goal: preserve author-facing structure while replacing visually unstable CSS constructs with PDF-friendlier primitives.
- Reusable rendering strategies:
  - convert `.gradient-text` at runtime into **inline SVG gradient text** after `document.fonts.ready`
  - replace radial-gradient glow pseudo-elements with **SVG background-image data URIs**
  - replace `backdrop-filter` floating surfaces with **glass-card** / **glass-pill** static gradient surfaces and borders
  - extend print rules with exact color adjustment
- Outputs:
  - `..._pdfsafe.live-html.pdf`
  - `..._pdfsafe.image.pdf`
  - both **12 pages**
- Validation: live-html variant retained extractable text with pdf-parse `textLength 8214` and included `UzzApp`.

## PPTX rebuild and native gradient pipeline

### Image-based PPTX reconstruction using OpenAI slides skill
#### `uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md`
- Describes a fast rebuild pipeline using the installed OpenAI curated slides skill.
- Workspace: `docs/UzzApp apresentacao Luis/pptx-rebuild`
- Generated deck: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pptx`
- This deck is **image-based**, assembled from existing slide PNGs in `output/image-pdf-slides`, not fully native-editable.
- Validation used **PowerPoint COM automation** because `soffice` / LibreOffice was unavailable.
- Dependency scope was intentionally minimized by importing only `pptxgenjs_helpers/layout`.
- Output size/state: about **13.46 MB**, **12 slides**.

### Native editable PPTX rebuild
#### `uzzapp_openai_slides_skill_pptx_rebuild.md`
- Moves from image-based reconstruction to a **native editable PowerPoint** using `PptxGenJS`.
- Builder: `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`
- Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx`
- Key architectural decisions:
  - keep deck editable with native text/shapes
  - approximate unsupported HTML gradients using layered semi-transparent native shapes
  - implement CTA buttons as native round-rect multi-shape components with hyperlink coverage on shapes and text
  - use **visual PNG render validation as source of truth**
- Environment note: PowerPoint COM is the practical validation fallback because `soffice` is unavailable.
- Special-case exception: `finish(s, 10, { skipWarnings: true });` due to false-positive native table bounds warnings on slide 10.
- Preserves 12-slide commercial deck narrative and pricing/contact content.

### Hybrid native-gradient editable PPTX pipeline
#### `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md`
- Defines the main hybrid workflow:
  1. `PptxGenJS` builds editable base deck
  2. `python-pptx` reopens it and applies native gradients to stable named shapes
  3. PowerShell wrapper runs both
  4. PowerPoint COM validates rendering
- Files:
  - builder: `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`
  - postprocessor: `docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py`
  - runner: `docs/UzzApp apresentacao Luis/pptx-rebuild/rebuild-native-gradients.ps1`
  - outputs:
    - `..._editable_native.pptx`
    - `..._editable_native_gradients.pptx`
- Core decision: apply **native gradients post-generation** to remove layered-shape artifacts while preserving editability and clickable CTA behavior.
- Stable named targets include:
  - `bg_canvas_s1` through `bg_canvas_s12`
  - `cta_demo_s1`
  - `cta_sales_s11`
  - `cta_sales_s12`
  - `plan_anual_s11`
- Important rules/patterns:
  - locate shapes by `shape.name`
  - call `fill.gradient()` and set `gradient_angle`
  - reuse the existing exposed gradient stop collection
  - use **two-stop gradients** because `python-pptx` exposes only 2 stops in this environment
  - validation error pattern: `Gradient stop count mismatch for {shape.name}: library exposes {len(stops)} stops, requested {len(stops_spec)}`
- Preserved behavior:
  - CTA shapes still have `GRADIENT` fill type
  - WhatsApp CTA hyperlinks remain intact after post-processing
  - slide 12 also carries `mailto:contato@uzzai.com.br` and `https://uzzai.com.br`
- Deck metadata/facts:
  - layout `LAYOUT_WIDE`
  - author `OpenAI Codex`
  - company `Uzz.Ai`
  - language `pt-BR`
  - fonts: **Poppins** headings, **Inter** body
  - 12 slides
  - slide 11 pricing: **R$ 247,00/mês**, **R$ 1.000,00** setup, **R$ 2.727/ano**
  - contact: `contato@uzzai.com.br`, `+55 54 99284-1942`

### HTML-background-aligned native gradient refinement
#### `uzzapp_native_gradient_html_background_alignment_2026_04_05.md`
- Refines the native-gradient pipeline to better match the HTML slide background.
- Keeps `python-pptx` first-pass + ZIP/XML post-processing approach.
- `postprocess-native-gradients.py` now rewrites `bg_canvas_s*` `gradFill gsLst` entries to a **3-stop gradient**:
  - `0D1520` at 0%
  - `162232` at 50%
  - `0D1A28` at 100%
- Reason: `python-pptx` only exposes two gradient stops in this environment, so lower-level ZIP/XML editing is used to overcome that limitation.
- Adds **ALT_OUT** fallback when the main PPTX is locked by PowerPoint.
- Validated artifact: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx`
- Validation render output: `docs/UzzApp apresentacao Luis/pptx-rebuild/rendered-ppt-native-gradients-htmlbg`

## Cross-entry patterns and evolution

- The UzzApp deck work evolves in a clear progression:
  1. fixed-dimension HTML + print-safe PDF (`commercial_deck_mobile_pdf_export_pattern.md`)
  2. fidelity-first live HTML PDF export (`uzzapp_deck_html_pdf_export_pattern_2026_04_02.md`)
  3. diagnostic live-vs-image comparison (`uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md`)
  4. export-only hybrid mutations as the preferred reusable strategy (`uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md`)
  5. reduced/minimal overrides (`uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md`)
  6. CTA-specific export stabilization and lighter PDF (`uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md`)
  7. PDF-safe HTML framework experiments (`uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md`)
  8. image-based PPTX rebuild, then native editable PPTX rebuild, then native-gradient post-processing (`uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md`, `uzzapp_openai_slides_skill_pptx_rebuild.md`, `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md`, `uzzapp_native_gradient_html_background_alignment_2026_04_05.md`)
- Repeated architectural preference across entries:
  - keep **author-facing HTML** high quality
  - move PDF/PPT export accommodations into **export-time transforms** or **post-processing**
  - preserve **text extractability**, **visual fidelity**, **editability**, and **hyperlinks**
- Repeated environment constraints:
  - `soffice` unavailable
  - PowerPoint COM used for validation
  - `python-pptx` gradient stop handling is limited in this environment
  - file locks from PowerPoint can require alternate output handling (`ALT_OUT`)