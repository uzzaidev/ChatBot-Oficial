---
title: Commercial Deck Export Facts 2026 03 31
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-31T12:37:19.593Z'
updatedAt: '2026-03-31T12:37:19.593Z'
---
## Raw Concept
**Task:**
Record factual project details for the commercial deck mobile/PDF export update

**Changes:**
- Commercial deck export flow documented
- Deterministic PDF output and asset path fixes recorded

**Files:**
- docs/UzzApp_Apresentacao_Comercial_v2.html
- scripts/export-uzzapp-commercial-pdf.js
- docs/UzzApp_Apresentacao_Comercial_v2.pdf

**Flow:**
deck update -> export script run -> PDF generated -> facts recorded

**Timestamp:** 2026-03-31

## Narrative
### Structure
This entry stores concrete facts rather than full design rationale, focusing on the deck file, export script, output PDF, layout dimensions, and corrected asset roots.

### Dependencies
Facts depend on the reported successful Puppeteer export flow and the corrected image path references within the deck HTML.

### Highlights
Includes the fixed 1280x720 slide size, export-pdf rendering mode, Puppeteer export sequence, and final 12-page PDF result.

## Facts
- **commercial_deck_adjustment**: The commercial deck was adjusted in docs/UzzApp_Apresentacao_Comercial_v2.html for mobile-friendly viewing and reliable PDF export. [project]
- **deck_layout_dimensions**: Slides use fixed 1280x720 layout dimensions with CSS variables --slide-width, --slide-height, and --deck-scale. [project]
- **deck_mobile_scaling_pattern**: Screen rendering scales each slide with transform: scale(var(--deck-scale)) and negative margin compensation to fit narrow viewports without reflowing slide internals. [project]
- **pdf_print_override_rules**: Print/PDF styles explicitly restate width, height, min-height, max-height, overflow, position, transform:none, and page-break rules inside @media print. [project]
- **export_pdf_mode**: body.export-pdf disables glow pseudo-elements, gradient text clipping, backdrop blur, device shadows/notches, and other transparency-heavy effects for PDF export. [project]
- **pdf_export_script**: scripts/export-uzzapp-commercial-pdf.js uses Puppeteer with viewport 1280x720, emulateMediaType("print"), waits for document.fonts.ready, and adds body.export-pdf before page.pdf({ preferCSSPageSize: true }). [project]
- **commercial_deck_pdf_output**: The generated PDF output is docs/UzzApp_Apresentacao_Comercial_v2.pdf with 12 pages. [project]
- **commercial_deck_image_paths**: Broken image references were fixed by repointing to assets under docs/Prints google and docs/ios/screenshots/auth-ipad-13in. [project]
