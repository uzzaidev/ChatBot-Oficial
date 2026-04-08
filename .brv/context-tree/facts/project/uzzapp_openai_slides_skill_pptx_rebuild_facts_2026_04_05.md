---
title: UzzApp OpenAI Slides Skill PPTX Rebuild Facts 2026 04 05
tags: []
related: [architecture/project_state/uzzapp_openai_slides_skill_pptx_rebuild.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-05T01:22:22.281Z'
updatedAt: '2026-04-05T01:48:41.628Z'
---
## Raw Concept
**Task:**
Capture factual project details for the UzzApp native PPTX commercial deck rebuild

**Changes:**
- Recorded source script and output PPTX paths
- Recorded CTA hyperlink implementation and validation facts
- Recorded environment-specific validation fallback and warning exceptions
- Recorded deck slide count and commercial pricing facts

**Files:**
- docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx

**Flow:**
extract project facts from rebuild summary -> deduplicate -> group by subject -> persist to facts/project

**Timestamp:** 2026-04-05

## Narrative
### Structure
This fact entry stores the stable implementation and output details for the UzzApp commercial deck rebuild as a native PowerPoint artifact. It captures the source builder file, generated PPTX path, editability guarantees, hyperlink verification status, validation fallback, and the most important commercial values embedded in the deck.

### Dependencies
These facts depend on the PptxGenJS rebuild implementation and on the Windows-specific validation setup where PowerPoint COM export is available but soffice is not. The warning interpretation also depends on known helper false positives for decorative and table-based slide elements.

### Highlights
The most important recall points are that the deck is a 12-slide editable native PPTX, CTA buttons are fully clickable native layered shapes, visual PNG output is the validation source of truth, and pricing in the deck is R$ 247,00 per month with a R$ 1.000,00 setup and R$ 2.727 annual option.

### Examples
Verified hyperlink targets include WhatsApp, site, and email links on slides 1, 11, and 12. One environment-specific exception is slide 10, where warning checks are intentionally skipped because native table bounds are misreported.

## Facts
- **uzzapp_deck_rebuild_format**: The UzzApp commercial deck was rebuilt as a native editable PowerPoint using PptxGenJS. [project]
- **uzzapp_deck_rebuild_source**: The source script for the rebuild is docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js. [project]
- **uzzapp_deck_rebuild_output**: The generated output file is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx. [project]
- **uzzapp_deck_editability**: The deck preserves editable text and native shapes. [project]
- **uzzapp_deck_gradient_strategy**: HTML gradients were approximated with layered semi-transparent native shapes because CSS-like text gradients are unsupported. [project]
- **uzzapp_deck_cta_pattern**: CTA buttons are native round-rect shapes with full-slide hyperlink support via shape and text hyperlink options. [project]
- **uzzapp_deck_hyperlink_verification**: Hyperlinks were verified in slide1, slide11, and slide12 rels for WhatsApp, site, and email targets. [project]
- **deck_validation_fallback**: PowerPoint COM export remains the practical validation fallback in this Windows environment because soffice is unavailable. [environment]
- **deck_validation_source_of_truth**: Visual PNG render validation is the source of truth for these decks. [convention]
- **slide10_warning_exception**: Slide 10 skips overlap warnings because native table bounds are misreported by the helper in this environment. [project]
- **uzzapp_deck_slide_count**: The generated deck has 12 slides. [project]
- **uzzapp_deck_pricing**: The deck pricing includes mensalidade of R$ 247,00 per month, setup único of R$ 1.000,00, and plano anual of R$ 2.727 per year. [project]
