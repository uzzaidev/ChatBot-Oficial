---
title: UzzApp Deck Live HTML vs Image PDF Comparison Pattern
tags: []
related: [architecture/project_state/uzzapp_deck_html_pdf_export_pattern.md, facts/project/uzzapp_deck_export_facts_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T12:57:46.151Z'
updatedAt: '2026-04-02T12:57:46.151Z'
---
## Raw Concept
**Task:**
Document the UzzApp commercial deck live-html versus image-based PDF export comparison and the resulting mobile PDF diagnostic pattern

**Changes:**
- Added a second comparison export path for the UzzApp commercial deck
- Implemented image-based PDF generation from per-slide screenshots
- Established a diagnostic comparison between live-html and image-based PDF outputs

**Files:**
- scripts/export-uzzapp-luis-image-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.live-html.pdf
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.image.pdf
- docs/UzzApp apresentacao Luis/output/image-pdf-slides

**Flow:**
render each slide in single-slide mode -> capture PNG via Page.screenshot() at 1280x720 -> save screenshots under output/image-pdf-slides -> assemble PNGs into image-based PDF -> compare live-html and image-pdf outputs on mobile

**Timestamp:** 2026-04-02

## Narrative
### Structure
The UzzApp commercial deck now has two export artifacts for comparison: a live-html PDF with selectable text and an image-based PDF assembled from slide screenshots. The image export pipeline is implemented in scripts/export-uzzapp-luis-image-pdf.js and stores intermediate slide images in docs/UzzApp apresentacao Luis/output/image-pdf-slides.

### Dependencies
The diagnostic workflow depends on slide rendering in single-slide mode, Puppeteer Page.screenshot() capture at 1280x720, PDF assembly from PNGs, and pdf-parse metrics used to confirm whether text remains extractable in the output.

### Highlights
Both comparison PDFs were generated successfully with 12 pages. The live-html PDF has pdf-parse textLength 8043 and contains the text UzzApp, while the image PDF has textLength 24 and no UzzApp text. As of 2026-04-02, this comparison is used to isolate mobile rendering issues to PDF viewer compatibility rather than missing deck assets when the image PDF remains visually correct.

### Examples
Comparison outputs: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.live-html.pdf and docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.image.pdf. Likely problematic live PDF constructs include print-mode color changes, transparency groups, gradients, filters, and exact-color handling.

## Facts
- **uzzapp_comparison_export_path**: A second comparison export path was added for the UzzApp commercial deck in docs/UzzApp apresentacao Luis. [project]
- **uzzapp_image_pdf_generation**: scripts/export-uzzapp-luis-image-pdf.js generates an image-based PDF by rendering each slide in single-slide mode at 1280x720 via Page.screenshot(). [project]
- **uzzapp_image_pdf_slide_output**: Screenshots for the image-based PDF are saved under docs/UzzApp apresentacao Luis/output/image-pdf-slides. [project]
- **uzzapp_live_html_pdf_metrics**: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.live-html.pdf was generated successfully with 12 pages, pdf-parse textLength 8043, and contains the text UzzApp. [project]
- **uzzapp_image_pdf_metrics**: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.image.pdf was generated successfully with 12 pages, pdf-parse textLength 24, and does not contain the text UzzApp. [project]
- **mobile_pdf_diagnostic_pattern**: If live-html renders incorrectly on mobile while image-pdf remains visually correct, the likely issue is mobile PDF viewer compatibility with live PDF constructs rather than missing deck assets. [project]
