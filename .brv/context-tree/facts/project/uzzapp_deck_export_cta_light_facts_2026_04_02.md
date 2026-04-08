---
title: UzzApp Deck Export CTA Light Facts 2026 04 02
tags: []
related: [architecture/project_state/uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T13:42:27.484Z'
updatedAt: '2026-04-02T13:42:27.484Z'
---
## Raw Concept
**Task:**
Record factual outcomes from the UzzApp CTA-light export-only PDF refinement

**Changes:**
- Recorded export override for CTA background
- Recorded reduced deviceScaleFactor setting
- Recorded validated PDF metrics for the CTA-light export artifact

**Files:**
- scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-cta-light.live-html.pdf

**Flow:**
refine export settings -> generate artifact -> validate PDF text and size -> record facts

**Timestamp:** 2026-04-02

## Narrative
### Structure
This fact record captures the final export-specific settings and measurable output from the CTA-light refinement pass for the UzzApp commercial deck PDF.

### Highlights
Key validated outcomes are the export-only CTA solid background override, deviceScaleFactor 1, and the resulting 12-page PDF with extractable text and approximately 1.41 MB size.

## Facts
- **uzzapp_remaining_export_issue**: The remaining issue after the minimal override pass was CTA button background rendering for the demo and pricing CTAs. [project]
- **uzzapp_cta_export_override**: The export script now forces .cta-btn to a solid brand green background only during export. [project]
- **uzzapp_puppeteer_device_scale_factor**: The export session uses Puppeteer viewport deviceScaleFactor 1 instead of 2. [project]
- **uzzapp_cta_light_pdf_path**: The generated PDF file is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-cta-light.live-html.pdf. [project]
- **uzzapp_cta_light_pdf_validation**: The generated CTA-light PDF has 12 pages, pdf-parse textLength 8214, contains UzzApp, and size about 1.41 MB. [project]
