---
title: UzzApp Deck Export Only Hybrid CTA Light PDF 2026 04 02
tags: []
related: [architecture/project_state/uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md, architecture/project_state/uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md, facts/project/uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T13:42:27.482Z'
updatedAt: '2026-04-02T13:42:27.482Z'
---
## Raw Concept
**Task:**
Refine the UzzApp export-only hybrid PDF strategy for mobile compatibility by stabilizing CTA button rendering and reducing output weight

**Changes:**
- Forced .cta-btn to a solid brand green background only during export
- Removed unstable CTA gradient rendering while preserving the rest of the deck
- Reduced Puppeteer viewport deviceScaleFactor from 2 to 1
- Generated a lighter export-only CTA-light live HTML PDF artifact

**Files:**
- scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-cta-light.live-html.pdf

**Flow:**
detect remaining export artifacts -> force stable CTA solid background during export -> reduce deviceScaleFactor -> generate PDF -> validate text extraction and file size

**Timestamp:** 2026-04-02

**Patterns:**
- `\.cta-btn` - CTA button selector overridden during export to apply stable solid background

## Narrative
### Structure
This refinement builds on the prior export-only minimal override strategy for the UzzApp deck. The export script remains conservative and only adjusts the CTA buttons specifically during the export path instead of changing the broader live deck styling.

### Dependencies
Depends on the export script at scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js, Puppeteer rendering behavior on mobile-style output, and pdf-parse validation for text extraction checks. It also assumes the existing live HTML export pipeline is preserved and only targeted export overrides are safe.

### Highlights
The remaining visual issue after the minimal override pass was CTA button backgrounds for “Quero uma demonstração” and the pricing CTA, plus perceived PDF heaviness. The updated export produced a 12-page PDF with extractable text (textLength 8214, contains UzzApp) and reduced size to about 1.41 MB versus the previous ~1.43 MB.

### Examples
Generated artifact: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-cta-light.live-html.pdf. Export-specific change: force .cta-btn to solid brand green only during PDF generation.

## Facts
- **uzzapp_export_cta_background**: The export-only hybrid PDF script forces .cta-btn to a solid brand green background only during export to avoid unstable gradient rendering. [project]
- **uzzapp_export_device_scale_factor**: Puppeteer viewport deviceScaleFactor was reduced from 2 to 1 for the export session to reduce PDF weight. [project]
- **uzzapp_export_cta_light_pdf_metrics**: The generated export-only CTA light PDF has 12 pages, extractable text length 8214, contains UzzApp, and size about 1.41 MB. [project]
