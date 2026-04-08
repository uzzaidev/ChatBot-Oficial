---
title: UzzApp Deck Export Only Hybrid Minimal Override Pattern 2026 04 02
tags: []
related: [architecture/project_state/uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md, architecture/project_state/uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md, facts/project/uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T13:39:27.381Z'
updatedAt: '2026-04-02T13:39:27.381Z'
---
## Raw Concept
**Task:**
Document the refined export-only hybrid PDF strategy for the UzzApp commercial deck after reducing excessive export-time overrides.

**Changes:**
- Identified that the first export-only hybrid strategy was visually too aggressive
- Reduced export-time overrides for stable UI elements
- Restricted stabilization to fragile rendering constructs only
- Produced a 12-page live HTML PDF with extractable text

**Files:**
- scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-minimal.live-html.pdf

**Flow:**
evaluate export-only strategy -> identify over-styled stable components -> preserve original HTML styling for stable elements -> stabilize only fragile layers at export time -> generate PDF -> verify extractable text with pdf-parse

**Timestamp:** 2026-04-02

## Narrative
### Structure
This pattern refines the UzzApp deck export pipeline in scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js. Instead of broadly replacing the live HTML styling during PDF export, the script now leaves visually stable components such as cards, stat pills, integration cards, and CTA buttons untouched and closer to their live presentation.

### Dependencies
The approach depends on the existing export-only hybrid PDF generation flow and on post-generation verification using pdf-parse. It also depends on correctly identifying which UI layers are genuinely fragile under PDF rendering, especially gradient text, blur or backdrop-filter overlays, bubble-ai surfaces, and selected device or browser mockup layers.

### Highlights
The key result is a more conservative export-only strategy that improves visual fidelity by minimizing unnecessary overrides. As of 2026-04-02, the generated PDF output contains 12 pages and extractable text, with pdf-parse reporting textLength 8214 and confirming the presence of the term UzzApp.

### Examples
Preserved in original HTML styling: normal cards, stat pills, integration cards, CTA buttons. Stabilized at export time: gradient text, blur/backdrop-filter overlays, bubble-ai surfaces, some device/browser mockup layers.

## Facts
- **uzzapp_export_only_hybrid_overrides**: The first export-only hybrid PDF strategy was too aggressive and degraded visual quality by overriding stat pills, cards, integration cards, and CTA buttons. [project]
- **uzzapp_export_only_hybrid_refinement**: The refined strategy keeps normal cards, stat pills, integration cards, and CTA buttons in their original HTML styling during export. [project]
- **uzzapp_export_only_stabilized_elements**: Export-time stabilization is limited to fragile constructs such as gradient text, blur and backdrop-filter overlays, bubble-ai surfaces, and some device or browser mockup layers. [project]
- **uzzapp_export_only_minimal_pdf_output**: The generated PDF docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-minimal.live-html.pdf had 12 pages and extractable text with pdf-parse textLength 8214 and contained UzzApp. [project]
