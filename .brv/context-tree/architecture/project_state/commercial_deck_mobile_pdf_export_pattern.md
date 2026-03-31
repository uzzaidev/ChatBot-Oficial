---
title: Commercial Deck Mobile PDF Export Pattern
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-03-31T12:37:19.591Z'
updatedAt: '2026-03-31T12:37:19.591Z'
---
## Raw Concept
**Task:**
Document the reusable pattern used to make the commercial HTML slide deck mobile-friendly while preserving reliable PDF export output

**Changes:**
- Adjusted docs/UzzApp_Apresentacao_Comercial_v2.html for mobile-friendly viewing
- Added CSS variables for slide dimensions and deck scaling
- Added explicit @media print overrides to prevent overlapping absolute-positioned content
- Added export-pdf rendering mode to disable PDF-hostile visual effects
- Added scripts/export-uzzapp-commercial-pdf.js for deterministic PDF generation
- Fixed broken image references to existing docs asset paths

**Files:**
- docs/UzzApp_Apresentacao_Comercial_v2.html
- scripts/export-uzzapp-commercial-pdf.js
- docs/UzzApp_Apresentacao_Comercial_v2.pdf
- docs/Prints google
- docs/ios/screenshots/auth-ipad-13in

**Flow:**
define fixed 1280x720 slides -> scale deck on screen with CSS transform and margin compensation -> override print layout with explicit dimensions and transform:none -> enable body.export-pdf to disable unstable visual effects -> run Puppeteer export with print media and fonts ready wait -> generate 12-page PDF

**Timestamp:** 2026-03-31

## Narrative
### Structure
The commercial presentation deck remains authored at fixed 1280x720 slide dimensions so internal absolute positioning does not reflow on smaller screens. Responsive behavior is implemented at the deck level using CSS variables for slide width, slide height, and deck scale, then applying transform-based scaling to each slide with compensating negative margins so the visual layout shrinks while slide internals preserve their original coordinate system.

### Dependencies
Reliable export depends on Puppeteer, print media emulation, document.fonts.ready before rendering, and a dedicated body.export-pdf mode that suppresses rendering effects known to misbehave in PDF viewers. Asset correctness also depends on image references pointing to existing files under docs/Prints google and docs/ios/screenshots/auth-ipad-13in.

### Highlights
The reusable pattern separates screen responsiveness from print fidelity: screen mode uses scaled fixed-dimension slides, while @media print fully restates width, height, min-height, max-height, overflow, position, transform:none, and page-break rules to prevent overlap in mobile PDF readers. The export script successfully generated docs/UzzApp_Apresentacao_Comercial_v2.pdf with 12 pages.

### Rules
Keep slides at fixed 1280x720 layout dimensions. Scale slides on screen with transform: scale(var(--deck-scale)) and negative margin compensation instead of reflowing slide internals. In @media print, explicitly restate width, height, min-height, max-height, overflow, position, transform:none, and page-break rules. Enable body.export-pdf during automated export and disable glow pseudo-elements, gradient text clipping, backdrop blur, device shadows/notches, and other transparency-heavy effects that can misrender in PDF viewers.

### Examples
Example export flow: set Puppeteer viewport to 1280x720, call emulateMediaType("print"), wait for document.fonts.ready, add body.export-pdf, then run page.pdf({ preferCSSPageSize: true }). Example assets repair: repoint broken deck images to docs/Prints google and docs/ios/screenshots/auth-ipad-13in.

## Facts
- **commercial_deck_adjustment**: The commercial deck was adjusted in docs/UzzApp_Apresentacao_Comercial_v2.html for mobile-friendly viewing and reliable PDF export. [project]
- **deck_layout_dimensions**: Slides use fixed 1280x720 layout dimensions with CSS variables --slide-width, --slide-height, and --deck-scale. [project]
- **deck_mobile_scaling_pattern**: Screen rendering scales each slide with transform: scale(var(--deck-scale)) and negative margin compensation to fit narrow viewports without reflowing slide internals. [project]
- **pdf_print_override_rules**: Print/PDF styles explicitly restate width, height, min-height, max-height, overflow, position, transform:none, and page-break rules inside @media print. [project]
- **export_pdf_mode**: body.export-pdf disables glow pseudo-elements, gradient text clipping, backdrop blur, device shadows/notches, and other transparency-heavy effects for PDF export. [project]
- **pdf_export_script**: scripts/export-uzzapp-commercial-pdf.js uses Puppeteer with viewport 1280x720, emulateMediaType("print"), waits for document.fonts.ready, and adds body.export-pdf before page.pdf({ preferCSSPageSize: true }). [project]
- **commercial_deck_pdf_output**: The generated PDF output is docs/UzzApp_Apresentacao_Comercial_v2.pdf with 12 pages. [project]
- **commercial_deck_image_paths**: Broken image references were fixed by repointing to assets under docs/Prints google and docs/ios/screenshots/auth-ipad-13in. [project]
