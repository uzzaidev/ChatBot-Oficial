---
children_hash: 770cc6ae6c49b619e4a7cfb7e33549fb8ac463cac5db5b329eaca38baba7d180
compression_ratio: 0.38224101479915434
condensation_order: 1
covers: [byterover_cwd_requirement_for_repository.md, chatbot_oficial_state_facts_2026_03_31.md, commercial_deck_export_facts_2026_03_31.md, context.md, initial_byterover_repository_sanity_check.md, theme_fallback_default_light_2026_03_31.md, uzzapp_deck_comparison_export_facts_2026_04_02.md, uzzapp_deck_export_cta_light_facts_2026_04_02.md, uzzapp_deck_export_facts_2026_04_02.md, uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md, uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md, uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md, uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md, uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md, uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md]
covers_token_total: 9460
summary_level: d1
token_count: 3616
type: summary
---
# Project Facts Overview

This topic captures durable, project-level operational facts for ChatBot-Oficial, with emphasis on repository workflow requirements, current app state, and the evolving UzzApp commercial deck export/PPTX pipeline. For broader implementation rationale, drill into related `architecture/project_state/*` entries referenced below.

## 1) Repository workflow and ByteRover operating requirements

### Core repository conventions
- `initial_byterover_repository_sanity_check.md` records the repository-level workflow contract from `AGENTS.md`:
  - run a project-scoped ByteRover query at task start
  - curate knowledge on significant completion
  - on `2026-03-31`, the initial project-scoped query returned no prior curated knowledge for this cwd
- `byterover_cwd_requirement_for_repository.md` adds the stable environment requirement:
  - all ByteRover MCP calls for this repo must pass  
    `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
  - reason: the ByteRover MCP server runs in global mode in this environment

### Topic framing
- `context.md` defines this topic as project-level facts for ChatBot-Oficial, especially:
  - initial knowledge-state checks
  - ByteRover usage requirements
  - repository-scoped workflow conventions

## 2) ChatBot-Oficial repository snapshot facts

### Current product and stack
- `chatbot_oficial_state_facts_2026_03_31.md` summarizes the repository snapshot as of `2026-03-31`:
  - ChatBot-Oficial is a multi-tenant SaaS for WhatsApp customer service with AI
  - apparent frontend stack: `Next.js 16` + `React 18`
  - major dependencies include `Supabase`, `Stripe`, `Redis`, `AI SDK/OpenAI/Groq`, `Capacitor`, and `Jest`

### Validation and docs state
- same entry records:
  - tests passed locally: `3 suites`, `10 tests`
  - lint completed with `12 warnings` and no errors
  - `README.md` still describes `Next.js 14` while `package.json` indicates `Next.js 16`, creating documentation drift
  - production build was not fully revalidated outside the sandbox; an `EPERM spawn` failure was treated as environment-related, not as confirmed app failure

### Recent development emphasis
- recent work was heavily centered on Meta/WhatsApp integration, including:
  - coexistence sync
  - unified multi-tenant webhook
  - SMB echoes
  - Embedded Signup
  - dashboard/settings work
  - improved logging and error handling

## 3) Theme behavior fact

- `theme_fallback_default_light_2026_03_31.md` records the app-wide theme fallback behavior from `src/app/layout.tsx`:
  - default fallback theme is `light`
  - applies when no persisted preference exists
  - storage key is `uzzapp-theme`
  - system theme auto-detection is disabled

## 4) Commercial deck HTML/PDF export evolution

These entries describe a progression from a mobile/PDF-safe HTML deck export to more refined live-HTML and export-only strategies for `docs/UzzApp apresentacao Luis/*`.

### Initial commercial deck PDF stabilization
- `commercial_deck_export_facts_2026_03_31.md` captures the earlier commercial deck export flow:
  - source deck: `docs/UzzApp_Apresentacao_Comercial_v2.html`
  - export script: `scripts/export-uzzapp-commercial-pdf.js`
  - output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - fixed slide size: `1280x720`
  - Puppeteer export sequence uses:
    - viewport `1280x720`
    - `emulateMediaType("print")`
    - `document.fonts.ready`
    - `body.export-pdf`
    - `page.pdf({ preferCSSPageSize: true })`
  - output had `12 pages`
  - broken image paths were corrected to assets under:
    - `docs/Prints google`
    - `docs/ios/screenshots/auth-ipad-13in`

### Shift to live HTML PDF for fidelity + selectable text
- `uzzapp_deck_export_facts_2026_04_02.md` records a design decision:
  - screenshot-based export was rejected
  - preferred pattern became exporting original HTML with Puppeteer in screen media
  - source files:
    - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html`
    - `scripts/export-uzzapp-luis-pdf.js`
    - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf`
  - preserved values:
    - viewport `1280x720`
    - waits for `document.fonts.ready`
    - `emulateMediaType('screen')`
    - export-only CSS enforces `@page` size `1280x720`, zero margins, exact color printing, fixed slide dimensions, page breaks
  - measured output:
    - `12 pages`
    - `pdf-parse textLength 8043`
    - contains `"UzzApp"` → confirms selectable/extractable text
  - key rule preserved: do not use an `export-pdf` mode that flattens gradients/glows/device details when exact visual fidelity and text selection are required

### Comparison: live HTML vs image-based PDF
- `uzzapp_deck_comparison_export_facts_2026_04_02.md` stores the comparison baseline:
  - image export script: `scripts/export-uzzapp-luis-image-pdf.js`
  - image slides saved under  
    `docs/UzzApp apresentacao Luis/output/image-pdf-slides`
  - compared outputs:
    - `UzzApp_Apresentacao_Comercial_v2.live-html.pdf`: `12 pages`, `textLength 8043`, contains `UzzApp`
    - `UzzApp_Apresentacao_Comercial_v2.image.pdf`: `12 pages`, `textLength 24`, does not contain `UzzApp`
  - diagnostic pattern:
    - if live HTML PDF renders badly on mobile but image PDF looks correct, the likely issue is mobile PDF viewer compatibility, not missing deck assets

## 5) PDF-safe and export-only hybrid refinement path

These entries show successive strategies for preserving deck appearance while keeping text extractable.

### Dedicated PDF-safe HTML variant
- `uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md` records an experiment with a separate HTML variant:
  - cloned deck:  
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.html`
  - outputs:
    - `..._pdfsafe.live-html.pdf`
    - `..._pdfsafe.image.pdf`
  - both had `12 pages`
  - live HTML output remained extractable with `textLength 8214` and contained `UzzApp`
  - stabilization techniques included:
    - converting gradient text to inline SVG after `document.fonts.ready`
    - replacing glow pseudo-elements with SVG `background-image` data URIs
    - replacing backdrop-blur surfaces with static glass-card / glass-pill styles
    - extending exact color print adjustment rules

### Export-only hybrid as preferred reusable pattern
- `uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md` records the architectural preference shift:
  - export-only transformation is better than modifying author-facing HTML with PDF-safe fallbacks
  - script: `scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js`
  - output:  
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf`
  - script behavior:
    - injects export-only CSS
    - flattens unstable surfaces during export
    - performs in-page SVG upgrades
  - output metrics:
    - `12 pages`
    - extractable text
    - `textLength 8214`
    - contains `UzzApp`
  - `package.json` includes npm script:  
    `export:uzzapp-luis-exportonly-hybrid-pdf`

### Minimal-override refinement
- `uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md` narrows the export-time override policy:
  - initial export-only hybrid degraded:
    - stat pills
    - cards
    - integration cards
    - CTA buttons
  - refined policy preserves original styling for those stable UI components
  - only fragile constructs are stabilized:
    - gradient text
    - blur/backdrop-filter overlays
    - bubble-ai surfaces
    - some mockup layers
  - output:
    - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-minimal.live-html.pdf`
    - `12 pages`
    - extractable text
    - `textLength 8214`

### CTA-specific light export fix
- `uzzapp_deck_export_cta_light_facts_2026_04_02.md` captures the final targeted refinement:
  - remaining issue after minimal override was CTA background rendering for demo/pricing CTAs
  - export script forces `.cta-btn` to a solid brand green background only during export
  - Puppeteer viewport uses `deviceScaleFactor 1` instead of `2`
  - output:
    - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-cta-light.live-html.pdf`
    - `12 pages`
    - `textLength 8214`
    - contains `UzzApp`
    - approx. `1.41 MB`

## 6) Native PPTX rebuild and native-gradient pipeline

These entries move beyond PDF export into editable PowerPoint generation for the same commercial deck.

### Native editable PPTX rebuild
- `uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md` records the first native PowerPoint rebuild:
  - source builder:  
    `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`
  - output:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx`
  - deck properties:
    - native editable PowerPoint using `PptxGenJS`
    - editable text and native shapes preserved
    - `12 slides`
  - CTA implementation:
    - native round-rect CTA shapes
    - hyperlink support through shape/text hyperlink options
    - hyperlink targets verified in slide relationships for WhatsApp, site, and email on slides `1`, `11`, and `12`
  - validation/environment facts:
    - PowerPoint COM export is the practical validation fallback on Windows because `soffice` is unavailable
    - visual PNG render validation is the source of truth
    - slide 10 warning checks are skipped because native table bounds are misreported
  - commercial facts embedded in the deck:
    - monthly: `R$ 247,00`
    - setup: `R$ 1.000,00`
    - annual: `R$ 2.727`

### Native gradient post-processing pipeline
- `uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md` extends the rebuild into a hybrid editable + postprocessed workflow:
  - builder: `build-uzzapp-ppt.js`
  - postprocessor: `postprocess-native-gradients.py`
  - runner: `rebuild-native-gradients.ps1`
  - artifacts:
    - base PPTX: `UzzApp_Apresentacao_Comercial_v2_editable_native.pptx`
    - postprocessed PPTX: `UzzApp_Apresentacao_Comercial_v2_editable_native_gradients.pptx`
  - pipeline flow:
    - build editable PPTX with `PptxGenJS`
    - reopen with `python-pptx`
    - apply native gradients to selected shapes
    - save new PPTX
    - verify gradients and hyperlinks
  - key architectural goal:
    - replace layered-shape gradient approximations with native gradients to remove rendering artifacts while preserving clickable CTAs
  - environment constraint:
    - `python-pptx` exposes only `2` gradient stops here
    - convention: use two-stop gradients; do not insert/remove stops
  - shape targeting and gradients:
    - stable shapes include `bg_canvas_s1`, `cta_demo_s1`, `cta_sales_s11`, `cta_sales_s12`, `plan_anual_s11`
    - backgrounds span `bg_canvas_s1` through `bg_canvas_s12`
    - background gradient angle `145`, colors `0D1520 -> 162232`
    - CTA gradient angle `0`, colors `1ABC9C -> 2E86AB`
    - annual plan colors `3D330B -> 7B650F`
  - preserved metadata and links:
    - layout `LAYOUT_WIDE`
    - author `OpenAI Codex`
    - company `Uzz.Ai`
    - language `pt-BR`
    - fonts `Poppins` and `Inter`
    - WhatsApp CTA links preserved
    - site link `https://uzzai.com.br`
    - email link `mailto:contato@uzzai.com.br`
    - contact slide includes `contato@uzzai.com.br` and `+55 54 99284-1942`
  - render validation confirmed CTA gradients render cleanly without prior layered artifact

### HTML background alignment update for native gradients
- `uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md` records a later refinement of that PPTX pipeline:
  - goal: match the HTML slide dark background more closely with a `3-stop` gradient
  - `postprocess-native-gradients.py` rewrites `bg_canvas_s*` `gradFill gsLst` entries to:
    - `0D1520` at `0%`
    - `162232` at `50%`
    - `0D1A28` at `100%`
  - because `python-pptx` still exposes only two gradient stops, the pipeline uses ZIP/XML post-processing as a workaround
  - adds `ALT_OUT` fallback so a new PPTX can be saved if the main file is locked by PowerPoint
  - validated artifact:
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx`

## 7) Main relationships and drill-down map

### Operational facts
- Start here for workflow constraints:
  - `initial_byterover_repository_sanity_check.md`
  - `byterover_cwd_requirement_for_repository.md`

### Project snapshot
- Start here for repo-wide state and validation:
  - `chatbot_oficial_state_facts_2026_03_31.md`
  - `theme_fallback_default_light_2026_03_31.md`

### HTML/PDF deck export path
- Baseline export:
  - `commercial_deck_export_facts_2026_03_31.md`
  - `uzzapp_deck_export_facts_2026_04_02.md`
- Diagnostic comparison:
  - `uzzapp_deck_comparison_export_facts_2026_04_02.md`
- Refinement variants:
  - `uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md`
  - `uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md`
  - `uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md`
  - `uzzapp_deck_export_cta_light_facts_2026_04_02.md`

### Editable PPTX path
- Native rebuild:
  - `uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md`
- Native gradient enhancement:
  - `uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md`
  - `uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md`

## 8) Stable patterns preserved across entries

- ChatBot-Oficial is documented as a multi-tenant WhatsApp AI SaaS with a current stack centered on Next.js/React and integrations like Supabase, Stripe, Redis, and AI providers.
- Repository operations depend on explicit ByteRover project scoping, especially the required cwd and mandated query/curation workflow.
- UzzApp deck work consistently targets:
  - `1280x720` slide geometry
  - `12-page` / `12-slide` outputs
  - preservation of selectable text where possible
  - exact visual fidelity for branded gradients, glows, CTAs, and mockups
- Export strategy evolved from print-mode PDF hardening to live-HTML fidelity, then to export-only hybrid stabilization, then to native editable PPTX generation with gradient post-processing.
- Validation strategy is environment-aware:
  - `pdf-parse` text metrics are used to confirm text-bearing PDFs
  - PowerPoint COM PNG renders are treated as the source of truth for PPTX output
  - environment limitations (`EPERM`, missing `soffice`, python-pptx gradient constraints, locked PPTX files) are explicitly worked around rather than treated as product defects