---
title: UzzApp Native Gradient HTML Background Alignment Facts 2026 04 05
tags: []
related: [architecture/project_state/uzzapp_native_gradient_html_background_alignment_2026_04_05.md, architecture/project_state/uzzapp_native_gradient_pptx_pipeline_2026_04_05.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T13:01:43.686Z'
updatedAt: '2026-04-05T13:01:43.686Z'
---
## Raw Concept
**Task:**
Capture factual details of the native-gradient HTML background alignment update for the UzzApp PPTX export pipeline.

**Changes:**
- Recorded 3-stop background gradient values
- Recorded ZIP/XML post-processing workaround
- Recorded ALT_OUT locked-file fallback
- Recorded validated PPTX artifact and render directory

**Files:**
- docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx
- docs/UzzApp apresentacao Luis/pptx-rebuild/rendered-ppt-native-gradients-htmlbg

**Flow:**
extract implementation facts -> deduplicate by statement overlap -> group by subject -> store under project facts

**Timestamp:** 2026-04-05

## Narrative
### Structure
This fact entry stores the concrete implementation and artifact details of the HTML background alignment update for the native-gradient PPTX export path.

### Dependencies
The facts depend on the current postprocess-native-gradients.py behavior, the PowerPoint file lock fallback path, and the validated artifact produced by the export pipeline.

### Highlights
Key preserved facts include the exact gradient stop values, the XML rewrite target, the python-pptx limitation, and the validated output artifact path.

### Examples
Example fact subjects: native_gradient_html_background_match, native_gradient_stops, python_pptx_gradient_limit, alt_out_fallback, validated_pptx_artifact.

## Facts
- **native_gradient_html_background_match**: The native-gradient PPTX pipeline was adjusted to match the HTML slide dark background using a 3-stop gradient. [project]
- **native_gradient_stops**: postprocess-native-gradients.py now rewrites bg_canvas_s* shape gradFill gsLst entries to use gradient stops 0D1520 at 0%, 162232 at 50%, and 0D1A28 at 100%. [project]
- **python_pptx_gradient_limit**: The pipeline uses ZIP/XML post-processing because python-pptx exposes only two gradient stops in the environment. [environment]
- **alt_out_fallback**: ALT_OUT fallback was added so the pipeline can save a new output file when the main PPTX is locked by PowerPoint. [project]
- **validated_pptx_artifact**: The validated artifact is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx. [project]
