---
children_hash: 15b406be43cedf8d7b2ba131960a02e877c3a6669dcce6a9f32cc26fa966a520
compression_ratio: 0.7612474437627812
condensation_order: 2
covers: [context.md, project/_index.md]
covers_token_total: 1956
summary_level: d2
token_count: 1489
type: summary
---
# Facts Domain Overview

This domain captures repository-level factual knowledge, operational constraints, and durable project metadata. It is centered on three main clusters: ByteRover workflow rules, project state facts, and the UzzApp commercial deck export/PPTX pipeline.

## Repository operation and ByteRover conventions
- **`initial_byterover_repository_sanity_check.md`** defines the working protocol: start tasks with a ByteRover query and curate meaningful knowledge when completing significant work. It also records that the initial project-scoped query found no prior curated knowledge for the working directory.
- **`byterover_cwd_requirement_for_repository.md`** adds a hard environment constraint: ByteRover MCP calls in this repo must use the explicit cwd `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial` because the server runs in global mode.
- Together these entries establish the repository’s expected operational pattern: cwd-specific ByteRover usage with curation as part of the workflow.

## Project snapshot and baseline facts
- **`chatbot_oficial_state_facts_2026_03_31.md`** captures the repository state around 2026-03-31. The project is a multi-tenant WhatsApp AI SaaS built with Next.js 16 + React 18, with core dependencies including Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, and Jest.
- It also notes validation status and drift signals: tests passed, lint completed with warnings, README appears stale relative to package.json, and recent work focused on Meta/WhatsApp integration, webhook unification, Embedded Signup, dashboard/settings, and logging/error handling.
- **`theme_fallback_default_light_2026_03_31.md`** records theme behavior: unsaved users fall back to light mode, the preference key is `uzzapp-theme`, and system theme auto-detection is disabled.

## Commercial deck export pipeline and rebuild facts
These entries document a progression from HTML/PDF export strategies to a native editable PowerPoint rebuild for the UzzApp commercial deck.

### HTML/PDF export path
- **`commercial_deck_export_facts_2026_03_31.md`** describes the initial stable HTML-to-PDF approach: fixed `1280x720` layout, mobile-friendly scaling, print overrides, export-only PDF-safe behavior, Puppeteer-based export, and a 12-page PDF output.
- Key referenced files include `docs/UzzApp_Apresentacao_Comercial_v2.html`, `scripts/export-uzzapp-commercial-pdf.js`, and `docs/UzzApp_Apresentacao_Comercial_v2.pdf`.

### Export comparisons and stabilization
- **`uzzapp_deck_export_facts_2026_04_02.md`** preserves the updated screen-media Puppeteer strategy after screenshot output was rejected. It emphasizes `emulateMediaType('screen')`, `document.fonts.ready`, export-only CSS constraints, exact-fidelity rules, and a 12-page text-extractable PDF with `textLength 8043`.
- **`uzzapp_deck_comparison_export_facts_2026_04_02.md`** compares `live-html.pdf` and `image.pdf`: both are 12 pages, but the live HTML version retains substantial text while the image-based version has almost none, making text length a diagnostic signal for mobile PDF viewer issues.
- **`uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md`** documents a PDF-safe HTML variant that uses runtime gradient-text SVG upgrades, glow-to-SVG substitutions, and glass surface replacements while preserving searchable text in the live-html PDF.
- **`uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md`** identifies the export-only hybrid strategy as the reusable pattern, using transient export-time mutation, in-page SVG upgrades, and a package script entry.
- **`uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md`** narrows stabilization to fragile constructs only, leaving normal cards/stat pills/CTA styling intact while stabilizing gradient text, blur overlays, bubble-AI surfaces, and some mockup layers.
- **`uzzapp_deck_export_cta_light_facts_2026_04_02.md`** records the final CTA-specific refinement: solid brand-green CTA backgrounds at export time, `deviceScaleFactor 1`, and a 12-page PDF with extractable text and about 1.41 MB size.

### Native editable PPTX rebuild
- **`uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md`** documents the native editable PowerPoint rebuild using PptxGenJS. The deck has 12 slides, keeps editable text and native shapes, uses native round-rect CTA buttons with hyperlinks, and relies on PowerPoint COM PNG validation as the source of truth in the Windows environment.
- It also preserves embedded pricing values: R$ 247,00/month, R$ 1.000,00 setup, and R$ 2.727/year.
- **`uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md`** describes the hybrid pipeline: build an editable PPTX, reopen with python-pptx, apply native gradient fills, then verify hyperlinks and visual output. It captures stable shape names, gradient colors/angles, CTA and annual-plan line styles, the font stack, embedded URLs, and the 12-slide output.
- **`uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md`** records the background-alignment update for the PPTX path: a 3-stop dark gradient match for HTML, ZIP/XML post-processing because python-pptx only exposes two stops here, an ALT_OUT fallback for locked files, and the validated artifact path.

## Cross-cutting patterns
- The deck work consistently distinguishes between **author-facing HTML**, **export-only PDF transformations**, and **native editable PPTX generation**.
- Recurrent technical themes include:
  - preserving selectable text where needed,
  - stabilizing fragile visual constructs during export,
  - using exact viewport/layout dimensions like `1280x720`,
  - validating outputs with measurable metrics such as page count and text length,
  - and preserving clickable WhatsApp, site, and email links through export and rebuild stages.
- Several entries reference related architecture topics for drill-down, indicating that implementation details are intentionally distributed across linked facts files.