---
title: UzzApp Native Gradient HTML Background Alignment 2026 04 05
tags: []
related: [architecture/project_state/uzzapp_native_gradient_pptx_pipeline_2026_04_05.md, facts/project/uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T13:01:43.683Z'
updatedAt: '2026-04-05T13:01:43.683Z'
---
## Raw Concept
**Task:**
Adjust the UzzApp PPTX native-gradient pipeline to better match the HTML slide background.

**Changes:**
- Kept python-pptx for initial gradient application
- Added ZIP/XML post-processing to rewrite bg_canvas_s* gradFill gsLst entries to a 3-stop gradient
- Aligned the PPTX background gradient to the HTML dark background colors 0D1520, 162232, and 0D1A28
- Added ALT_OUT fallback for cases where the main PPTX is locked by PowerPoint
- Validated the new artifact via PowerPoint COM render

**Files:**
- docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx
- docs/UzzApp apresentacao Luis/pptx-rebuild/rendered-ppt-native-gradients-htmlbg

**Flow:**
apply initial gradients with python-pptx -> post-process PPTX ZIP/XML -> rewrite bg_canvas_s* gradFill gsLst to 3-stop HTML-matched gradient -> save primary or ALT_OUT output if locked -> validate via PowerPoint COM render

**Timestamp:** 2026-04-05

**Patterns:**
- `bg_canvas_s.*` - Targets background canvas shapes whose gradFill gsLst entries are rewritten during XML post-processing

## Narrative
### Structure
The pipeline remains centered on postprocess-native-gradients.py. It still relies on python-pptx for the first-pass gradient setup, then reopens the generated PPTX as a ZIP package and edits the slide XML to overcome library limitations in gradient stop control.

### Dependencies
The workaround depends on python-pptx for baseline PPTX manipulation, ZIP/XML post-processing for low-level gradFill edits, and PowerPoint COM rendering for visual validation. The fallback behavior also depends on detecting cases where PowerPoint keeps the main output file locked.

### Highlights
The background now matches the HTML slide styling more closely by using a 3-stop dark gradient: 0D1520 at 0%, 162232 at 50%, and 0D1A28 at 100%. The update also makes the export flow more resilient by writing to ALT_OUT when the main PPTX cannot be overwritten due to a file lock.

### Examples
Validated output: docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx. Validation renders: docs/UzzApp apresentacao Luis/pptx-rebuild/rendered-ppt-native-gradients-htmlbg. Grouped facts captured for subjects: native_gradient_html_background_match, native_gradient_stops, python_pptx_gradient_limit, alt_out_fallback, validated_pptx_artifact.

## Facts
- **native_gradient_html_background_match**: The native-gradient PPTX pipeline was adjusted to match the HTML slide dark background using a 3-stop gradient. [project]
- **native_gradient_stops**: postprocess-native-gradients.py now rewrites bg_canvas_s* shape gradFill gsLst entries to use gradient stops 0D1520 at 0%, 162232 at 50%, and 0D1A28 at 100%. [project]
- **python_pptx_gradient_limit**: The pipeline uses ZIP/XML post-processing because python-pptx exposes only two gradient stops in the environment. [environment]
- **alt_out_fallback**: ALT_OUT fallback was added so the pipeline can save a new output file when the main PPTX is locked by PowerPoint. [project]
- **validated_pptx_artifact**: The validated artifact is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx. [project]
