---
title: UzzApp Deck Export Only Hybrid PDF Facts 2026-04-02
tags: []
related: [architecture/project_state/uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T13:35:23.348Z'
updatedAt: '2026-04-02T13:35:23.348Z'
---
## Raw Concept
**Task:**
Record factual details of the UzzApp export-only hybrid PDF implementation and generated artifact.

**Changes:**
- Recorded export-only strategy preference
- Recorded export script behavior and PDF metrics
- Recorded package script addition

**Files:**
- scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf
- package.json

**Flow:**
original HTML preserved -> export script mutates presentation transiently -> PDF generated -> text extraction validated

**Timestamp:** 2026-04-02

## Narrative
### Structure
This fact entry captures the decision, implementation artifact, output artifact, and validation metrics for the export-only PDF pipeline.

### Dependencies
Tied to the UzzApp deck export flow and the presence of the export script plus generated PDF artifact.

### Highlights
Key metrics preserved are 12 pages, extractable text, pdf-parse textLength 8214, and confirmation that the PDF contains UzzApp.

## Facts
- **uzzapp_exportonly_pattern_preference**: Export-only transformation is the better reusable pattern for the UzzApp commercial deck than modifying author-facing HTML with PDF-safe fallbacks. [project]
- **uzzapp_exportonly_script_behavior**: scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js injects export-only CSS to flatten unstable surfaces and performs in-page SVG upgrades during export. [project]
- **uzzapp_exportonly_pdf_metrics**: The generated export-only hybrid PDF has 12 pages and extractable text with pdf-parse textLength 8214. [project]
- **uzzapp_exportonly_pdf_contains_brand**: The generated PDF contains the string UzzApp. [project]
- **uzzapp_exportonly_npm_script**: package.json includes the script export:uzzapp-luis-exportonly-hybrid-pdf. [project]
