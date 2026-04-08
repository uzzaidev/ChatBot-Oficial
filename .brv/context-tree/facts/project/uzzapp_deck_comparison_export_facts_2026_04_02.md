---
title: UzzApp Deck Comparison Export Facts 2026 04 02
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T12:57:46.153Z'
updatedAt: '2026-04-02T12:57:46.153Z'
---
## Raw Concept
**Task:**
Capture project facts for the UzzApp commercial deck comparison export outputs generated on 2026-04-02

**Changes:**
- Recorded metrics for live-html PDF output
- Recorded metrics for image-based PDF output
- Captured mobile PDF diagnostic interpretation from the comparison

**Files:**
- scripts/export-uzzapp-luis-image-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.live-html.pdf
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.image.pdf

**Flow:**
generate live-html PDF -> generate image-based PDF -> inspect page counts and pdf-parse text metrics -> compare mobile rendering behavior

**Timestamp:** 2026-04-02

## Narrative
### Structure
This fact entry stores the measurable output characteristics of the two UzzApp commercial deck PDF variants generated for comparison on 2026-04-02.

### Dependencies
The facts depend on successful generation of both PDF files and pdf-parse inspection of extracted text length and text presence.

### Highlights
live-html.pdf: 12 pages, textLength 8043, contains UzzApp. image.pdf: 12 pages, textLength 24, does not contain UzzApp. The contrast provides a concrete signal for diagnosing viewer-side rendering issues.

## Facts
- **uzzapp_comparison_export_path**: A second comparison export path was added for the UzzApp commercial deck in docs/UzzApp apresentacao Luis. [project]
- **uzzapp_image_pdf_generation**: scripts/export-uzzapp-luis-image-pdf.js generates an image-based PDF by rendering each slide in single-slide mode at 1280x720 via Page.screenshot(). [project]
- **uzzapp_image_pdf_slide_output**: Screenshots for the image-based PDF are saved under docs/UzzApp apresentacao Luis/output/image-pdf-slides. [project]
- **uzzapp_live_html_pdf_metrics**: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.live-html.pdf was generated successfully with 12 pages, pdf-parse textLength 8043, and contains the text UzzApp. [project]
- **uzzapp_image_pdf_metrics**: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.image.pdf was generated successfully with 12 pages, pdf-parse textLength 24, and does not contain the text UzzApp. [project]
- **mobile_pdf_diagnostic_pattern**: If live-html renders incorrectly on mobile while image-pdf remains visually correct, the likely issue is mobile PDF viewer compatibility with live PDF constructs rather than missing deck assets. [project]
