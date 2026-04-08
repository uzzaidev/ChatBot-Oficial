---
title: UzzApp Deck Export Facts 2026 04 02
tags: []
related: [architecture/project_state/uzzapp_deck_html_pdf_export_pattern_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T12:50:02.215Z'
updatedAt: '2026-04-02T12:50:02.215Z'
---
## Raw Concept
**Task:**
Record factual project details about the updated UzzApp commercial deck PDF export workflow.

**Changes:**
- Documented updated export workflow facts
- Captured validation metrics for generated PDF

**Files:**
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html
- scripts/export-uzzapp-luis-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf

**Flow:**
user rejected screenshot export -> implement Puppeteer screen-media export -> validate PDF text extraction

**Timestamp:** 2026-04-02

## Narrative
### Structure
This entry stores concise project facts for rapid recall of the UzzApp deck export implementation and validation outcome. It complements the architectural pattern entry by emphasizing concrete values, rules, and measured results.

### Dependencies
Depends on the same HTML deck, Puppeteer export script, and PDF validation tooling referenced by the implementation work.

### Highlights
Key retained values include viewport 1280x720, 12 output pages, textLength 8043, and a rule against fidelity-damaging export modes when selectable text is required.

### Rules
Important rule: do not add an export-pdf mode that flattens gradients, glows, or device details when the user requires exact visual fidelity and text selection.

### Examples
Example fact set: viewport 1280x720, screen media emulation enabled, export-only CSS applied, resulting PDF remained text-extractable.

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
