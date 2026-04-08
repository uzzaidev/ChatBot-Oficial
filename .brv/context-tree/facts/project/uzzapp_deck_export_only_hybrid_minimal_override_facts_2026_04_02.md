---
title: UzzApp Deck Export Only Hybrid Minimal Override Facts 2026 04 02
tags: []
related: [architecture/project_state/uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-02T13:39:27.382Z'
updatedAt: '2026-04-02T13:39:27.382Z'
---
## Raw Concept
**Task:**
Record factual details from the refined minimal-override export-only hybrid PDF result for the UzzApp deck.

**Changes:**
- Captured issue in original export-only hybrid attempt
- Captured narrowed stabilization scope
- Captured generated PDF verification metrics

**Files:**
- scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-minimal.live-html.pdf

**Flow:**
identify issue -> narrow override scope -> export PDF -> verify text extraction metrics

**Timestamp:** 2026-04-02

## Narrative
### Structure
This facts entry records the concrete constraints and output metrics for the UzzApp export-only hybrid PDF refinement. It focuses on what changed in the export policy and what measurable output was produced.

### Highlights
The stable UI components remain in original styling, while only fragile constructs are stabilized. The resulting PDF is a 12-page extractable-text artifact verified with pdf-parse at textLength 8214.

## Facts
- **initial_export_only_hybrid_issue**: The initial export-only hybrid PDF approach degraded visuals by overriding stat pills, cards, integration cards, and CTA buttons. [project]
- **refined_export_only_hybrid_policy**: The refined export-only hybrid approach preserves original HTML styling for normal cards, stat pills, integration cards, and CTA buttons. [project]
- **export_time_stabilization_scope**: Only fragile constructs receive export-time stabilization: gradient text, blur or backdrop-filter overlays, bubble-ai surfaces, and some mockup layers. [project]
- **minimal_override_pdf_path**: The output PDF path is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-minimal.live-html.pdf. [project]
- **minimal_override_pdf_verification**: The generated PDF has 12 pages and extractable text, with pdf-parse textLength 8214. [project]
