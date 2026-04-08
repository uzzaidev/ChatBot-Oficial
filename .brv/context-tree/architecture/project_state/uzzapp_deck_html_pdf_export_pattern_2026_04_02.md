---
title: UzzApp Deck HTML PDF Export Pattern 2026 04 02
tags: []
related: [architecture/project_state/commercial_deck_mobile_pdf_export_pattern.md, facts/project/commercial_deck_export_facts_2026_03_31.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T12:50:02.211Z'
updatedAt: '2026-04-02T12:50:02.211Z'
---
## Raw Concept
**Task:**
Document the updated UzzApp commercial deck PDF export strategy that preserves live selectable text and exact visual fidelity.

**Changes:**
- Replaced screenshot-based PDF export approach after user rejection
- Standardized a reusable Puppeteer HTML export pattern using screen media
- Added export-only CSS injection instead of modifying source HTML
- Validated text extractability and page count of the generated PDF

**Files:**
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html
- scripts/export-uzzapp-luis-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf

**Flow:**
open HTML deck at 1280x720 -> wait for document.fonts.ready -> emulate screen media -> inject minimal export-only CSS -> generate PDF with preserved layout and text -> validate pages and text extractability

**Timestamp:** 2026-04-02

## Narrative
### Structure
The commercial deck remains authored as HTML and is exported directly by Puppeteer rather than being converted into slide screenshots. The export script uses a 1280x720 viewport to match slide geometry and applies only transient export CSS so the original HTML file does not need presentation-specific mutations for PDF output.

### Dependencies
This workflow depends on Puppeteer-based rendering, font readiness through document.fonts.ready, screen-media rendering via emulateMediaType('screen'), and pdf-parse based validation of resulting text extractability. The approach also depends on retaining the original deck shell and slide structure so export-only CSS can normalize layout without destructive rasterization.

### Highlights
The reusable pattern preserves selectable text while maintaining gradients, glows, and device-detail fidelity that would be lost in image-flattened exports. Validation confirmed a successful 12-page PDF and textLength 8043 with the token "UzzApp" present, demonstrating the PDF is not image-only.

### Rules
Important rule: do not add an export-pdf mode that flattens gradients, glows, or device details when the user requires exact visual fidelity and text selection.

### Examples
Example export behavior: scripts/export-uzzapp-luis-pdf.js opens docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html at 1280x720, waits for document.fonts.ready, calls emulateMediaType('screen'), then injects CSS that enforces @page 1280x720, zero margins, exact color printing, fixed slide dimensions, page breaks, and deck-shell/deck cleanup before writing the PDF.

## Facts
- **uzzapp_deck_export_strategy_change**: The UzzApp commercial deck PDF export strategy was changed after the user rejected screenshot-based PDF output. [project]
- **html_pdf_export_pattern**: The reusable export pattern preserves live selectable text by exporting the original HTML with Puppeteer in screen media instead of rasterizing slides. [project]
- **uzzapp_export_viewport**: scripts/export-uzzapp-luis-pdf.js opens the deck at 1280x720 before PDF generation. [project]
- **uzzapp_export_font_readiness**: The export waits for document.fonts.ready before generating the PDF. [project]
- **uzzapp_export_media_type**: The export process calls emulateMediaType('screen') for PDF rendering. [project]
- **uzzapp_export_css_constraints**: Export-only CSS enforces @page size 1280x720, zero margins, exact color printing, fixed slide dimensions, page breaks, and deck layout cleanup without changing source HTML. [project]
- **pdf_export_fidelity_rule**: The project rule is to avoid an export-pdf mode that flattens gradients, glows, or device details when exact visual fidelity and text selection are required. [convention]
- **uzzapp_pdf_page_count**: The generated UzzApp_Apresentacao_Comercial_v2.pdf had 12 pages. [project]
- **uzzapp_pdf_text_length**: pdf-parse reported textLength 8043 for the generated UzzApp deck PDF. [project]
- **uzzapp_pdf_text_extractable**: The generated PDF included the text "UzzApp", confirming it remained text-extractable rather than image-only. [project]
