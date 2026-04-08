---
title: UzzApp Deck PDF-safe Variant Facts 2026-04-02
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T13:19:41.917Z'
updatedAt: '2026-04-02T13:19:41.917Z'
---
## Raw Concept
**Task:**
Record factual outcomes from the UzzApp PDF-safe deck variant experiment

**Changes:**
- Created PDF-safe HTML variant
- Generated two PDF outputs
- Validated live-html text extraction

**Files:**
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.html
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.live-html.pdf
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.image.pdf

**Flow:**
create variant -> export PDFs -> validate output

**Timestamp:** 2026-04-02

## Narrative
### Structure
This entry stores the concrete outputs, validation numbers, and implementation choices from the PDF-safe variant effort as quick-recall project facts.

### Highlights
The variant exists as a dedicated HTML file, both exported PDFs have 12 pages, and the live-html PDF kept searchable text with pdf-parse textLength 8214.

### Examples
Fact examples include the exact variant file path, the two generated PDF paths, and the extractable-text validation result.

## Facts
- **uzzapp_pdfsafe_variant**: An experimental PDF-friendly deck framework variant was created for docs/UzzApp apresentacao Luis. [project]
- **uzzapp_pdfsafe_html**: The original deck was cloned to docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.html. [project]
- **gradient_text_strategy**: Gradient text is upgraded at runtime into inline SVG gradient text after document.fonts.ready using computed font styles and canvas text measurement. [project]
- **glow_rendering_strategy**: CSS glow pseudo-elements based on radial-gradient are replaced with SVG background-image data URIs per glow class. [project]
- **glass_surface_strategy**: Backdrop-filter blur cards and pills are replaced with glass-card and glass-pill static gradient surfaces and borders. [project]
- **print_color_adjustment**: Print rules were extended with exact color adjustment for slides, glow layer, SVG gradient text, and glass surfaces. [project]
- **pdfsafe_outputs**: Generated outputs include live-html and image PDFs for the pdfsafe variant, both with 12 pages. [project]
- **live_html_pdf_validation**: The live-html PDF validation reported pdf-parse textLength 8214 and included 'UzzApp', confirming extractable text. [project]
