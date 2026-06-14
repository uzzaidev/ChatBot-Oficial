---
children_hash: 019f118f2548691822d7efb75c27bd4161ab3bbac456493a37f8d15795a0305d
compression_ratio: 0.16080141181355756
condensation_order: 1
covers: [byterover_cwd_requirement_for_repository.md, chatbot_oficial_state_facts_2026_03_31.md, commercial_deck_export_facts_2026_03_31.md, context.md, initial_byterover_repository_sanity_check.md, theme_fallback_default_light_2026_03_31.md, uzzapp_deck_comparison_export_facts_2026_04_02.md, uzzapp_deck_export_cta_light_facts_2026_04_02.md, uzzapp_deck_export_facts_2026_04_02.md, uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md, uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md, uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md, uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md, uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md, uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md]
covers_token_total: 9633
summary_level: d1
token_count: 1549
type: summary
---
# Project Facts Overview

This level consolidates repository-wide operational requirements, current project state, and UzzApp commercial deck export/rebuild knowledge. The entries form three clear clusters: ByteRover workflow rules, project snapshot facts, and the deck export/PPTX pipeline with multiple output variants.

## ByteRover workflow and repository conventions
- **`initial_byterover_repository_sanity_check.md`** establishes the repository protocol: run a ByteRover query at task start, then curate meaningful knowledge on significant completion. It also records that the initial project-scoped query found no prior curated knowledge for the working directory at the time.
- **`byterover_cwd_requirement_for_repository.md`** adds a stable environment fact: ByteRover MCP calls in this repository must pass the explicit cwd `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial` because the server runs in global mode.
- These entries together define the operating expectation for future sessions: repository-scoped, cwd-specific ByteRover usage with curation as part of the workflow.

## Project state and baseline facts
- **`chatbot_oficial_state_facts_2026_03_31.md`** captures the repository snapshot around 2026-03-31: the project is a multi-tenant WhatsApp AI SaaS, the main stack is Next.js 16 + React 18, and core dependencies include Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, and Jest.
- It also records validation status and drift signals: tests passed, lint completed with warnings only, README appears stale relative to package.json, and recent work focused on Meta/WhatsApp integration, webhook unification, Embedded Signup, dashboard/settings, and logging/error handling.
- **`theme_fallback_default_light_2026_03_31.md`** documents the app’s theme behavior: unsaved users fall back to light mode, the preference key is `uzzapp-theme`, and system theme auto-detection is disabled.

## Commercial deck export pipeline and validation findings
These entries describe a progression of export strategies for the UzzApp commercial deck, each preserving measurable output facts and implementation decisions.

### Base HTML/PDF export path
- **`commercial_deck_export_facts_2026_03_31.md`** records the initial reliable HTML-to-PDF export setup: fixed 1280x720 layout, mobile-friendly scaling, print overrides, export-only PDF-safe behavior, Puppeteer-based export, and a 12-page PDF output.
- Key file references: `docs/UzzApp_Apresentacao_Comercial_v2.html`, `scripts/export-uzzapp-commercial-pdf.js`, and `docs/UzzApp_Apresentacao_Comercial_v2.pdf`.

### UzzApp deck comparison and diagnostics
- **`uzzapp_deck_export_facts_2026_04_02.md`** preserves the updated screen-media Puppeteer export strategy after screenshot output was rejected. It emphasizes exact-fidelity rules, `emulateMediaType('screen')`, `document.fonts.ready`, export-only CSS constraints, and a 12-page text-extractable PDF with `textLength 8043`.
- **`uzzapp_deck_comparison_export_facts_2026_04_02.md`** compares two artifact modes: `live-html.pdf` and `image.pdf`. Both are 12 pages, but the live HTML version retains substantial text (`textLength 8043`) while the image-based PDF has almost no text (`textLength 24`), which is used as a diagnostic signal for mobile PDF viewer issues.
- **`uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md`** describes a PDF-safe HTML variant with runtime gradient-text SVG upgrades, glow-to-SVG substitutions, and glass surface replacements. It validates two 12-page outputs and confirms searchable text in the live-html PDF.
- **`uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md`** identifies the export-only hybrid strategy as the preferred reusable pattern, with transient export-time mutation, in-page SVG upgrades, and a package script entry for the workflow.
- **`uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md`** narrows the stabilization scope to fragile constructs only, preserving normal cards/stat pills/CTA styling while stabilizing gradient text, blur overlays, bubble-AI surfaces, and some mockup layers.
- **`uzzapp_deck_export_cta_light_facts_2026_04_02.md`** records the final CTA-specific refinement: export-time solid brand-green CTA backgrounds, `deviceScaleFactor 1`, and a 12-page PDF with extractable text and approximately 1.41 MB size.

### Native-gradient PPTX rebuild path
- **`uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md`** documents the native editable PowerPoint rebuild using PptxGenJS. The deck is 12 slides, preserves editable text and native shapes, uses native round-rect CTA buttons with hyperlinks, and relies on PowerPoint COM PNG validation as the source of truth in this Windows environment.
- It also preserves the commercial pricing values embedded in the deck: R$ 247,00/month, R$ 1.000,00 setup, and R$ 2.727/year.
- **`uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md`** describes the hybrid pipeline: build editable PPTX, reopen with python-pptx, apply native gradient fills, and verify hyperlinks/visual output. It captures stable shape names, gradient colors/angles, CTA and annual plan line styles, font stack, embedded URLs, and the 12-slide output.
- **`uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md`** records the background-alignment update for the PPTX path: a 3-stop dark gradient match for HTML, ZIP/XML post-processing because python-pptx only exposes two stops here, an ALT_OUT fallback for locked files, and the validated artifact path.

## Cross-cutting patterns
- The deck work repeatedly distinguishes between **author-facing HTML**, **export-only PDF transformations**, and **native editable PPTX generation**.
- Recurrent technical themes include:
  - preserving selectable text where required,
  - stabilizing fragile visual constructs during export,
  - using exact viewport/layout dimensions (`1280x720`),
  - validating outputs with measurable metrics such as page count and text length,
  - and preserving clickable WhatsApp/site/email links through export and rebuild stages.
- Several facts entries reference each other via related architecture topics, indicating drill-down paths for deeper implementation detail.