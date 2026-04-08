---
title: UzzApp Deck Export Only Hybrid PDF Pattern 2026-04-02
tags: []
related: [architecture/project_state/uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md, architecture/project_state/uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md, facts/project/uzzapp_deck_export_facts_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T13:35:23.346Z'
updatedAt: '2026-04-02T13:35:23.346Z'
---
## Raw Concept
**Task:**
Document the export-only hybrid PDF strategy used for the UzzApp commercial deck to preserve live HTML quality while generating PDF-safe output.

**Changes:**
- Established export-only transformation as the preferred PDF generation pattern for the UzzApp commercial deck
- Implemented scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js to inject PDF-safe CSS and DOM changes only during export
- Generated docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf with extractable text
- Added package.json script export:uzzapp-luis-exportonly-hybrid-pdf

**Files:**
- scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf
- package.json

**Flow:**
keep original marketing HTML intact -> load deck in Puppeteer export script -> inject export-only CSS/DOM mutations -> convert gradient text and CTA backgrounds to inline SVG during export -> generate extractable-text PDF

**Timestamp:** 2026-04-02

## Narrative
### Structure
The reusable pattern separates authoring quality from export stability. The marketing deck remains visually rich in its original HTML form, while the export script applies temporary PDF-safe adaptations only inside the Puppeteer rendering session.

### Dependencies
Depends on a Puppeteer-based export flow and in-page DOM/CSS mutation support. The export path specifically targets unstable visual surfaces including cards, stat pills, integration cards, device screens, browser frames, bubble-ai elements, and blur-heavy overlays.

### Highlights
The export script flattens unstable surfaces, upgrades gradient text to inline SVG in-page during export, and upgrades CTA buttons to inline SVG backgrounds only during export. The resulting PDF has 12 pages, includes extractable text verified with pdf-parse textLength 8214, and contains the string UzzApp.

### Examples
Example export-only targets: cards, stat pills, integ cards, device screens, browser frames, bubble-ai, blur-heavy overlays. Example output: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf.

## Facts
- **uzzapp_pdf_fallback_strategy_problem**: For the UzzApp commercial deck, baking PDF-safe fallbacks directly into the author-facing HTML degraded visual quality. [project]
- **uzzapp_export_strategy**: The preferred reusable pattern is export-only transformation: preserve the original marketing HTML and apply PDF-safe CSS and DOM mutations only during Puppeteer export. [project]
- **uzzapp_exportonly_script**: The implementation script is scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js. [project]
- **uzzapp_exportonly_pdf_output**: The generated PDF is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf with 12 pages and extractable text. [project]
- **uzzapp_exportonly_package_script**: A package.json script named export:uzzapp-luis-exportonly-hybrid-pdf was added. [project]
