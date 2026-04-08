---
title: UzzApp Native Gradient PPTX Pipeline 2026 04 05
tags: []
related: [architecture/project_state/uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md, facts/project/uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T12:42:30.327Z'
updatedAt: '2026-04-05T12:42:30.327Z'
---
## Raw Concept
**Task:**
Document the hybrid PptxGenJS and python-pptx pipeline used to generate the UzzApp commercial presentation with native gradients and preserved hyperlinks

**Changes:**
- Kept PptxGenJS as the editable base deck builder
- Added python-pptx post-processing for native gradients
- Added a PowerShell runner for one-click rebuild
- Preserved CTA hyperlinks after gradient post-processing
- Validated native rendering through PowerPoint COM

**Files:**
- docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js
- docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py
- docs/UzzApp apresentacao Luis/pptx-rebuild/rebuild-native-gradients.ps1
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx
- docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients.pptx

**Flow:**
PptxGenJS builds editable base deck -> python-pptx reopens deck and applies native gradients to stable named shapes -> PowerShell wrapper runs both steps -> final PPTX is verified for gradient fill and preserved hyperlinks -> PowerPoint COM confirms artifact-free rendering

**Timestamp:** 2026-04-05

**Author:** OpenAI Codex

**Patterns:**
- `Gradient stop count mismatch for {shape.name}: library exposes {len(stops)} stops, requested {len(stops_spec)}` - Exact validation error for mismatched gradient stop counts in the python-pptx post-processor

## Narrative
### Structure
This implementation defines a hybrid editable-deck workflow for the UzzApp commercial presentation. The JavaScript builder creates the full 12-slide PPTX, preserves hyperlink-bearing CTA shapes, and establishes stable object names for later targeting. The Python post-processor then reopens the generated file, locates background and CTA shapes by shape.name, applies native gradients, adjusts line styling where required, and saves a separate post-processed deck.

### Dependencies
The workflow depends on Node.js, PptxGenJS, python-pptx, and a Windows environment where PowerPoint COM can be used for render validation. It also depends on stable generated shape names and on the environment-specific python-pptx behavior that exposes a two-stop gradient collection rather than permitting arbitrary stop insertion or removal.

### Highlights
As of 2026-04-05, the final commercial deck remains editable and contains 12 slides. CTA shapes preserve WhatsApp hyperlinks after native gradient mutation, while slide 12 also carries embedded email and website links. Gradient post-processing is explicitly used to remove the prior layered-shape artifact without sacrificing clickable CTA behavior or editable PPTX output.

### Rules
1. PptxGenJS remains the builder for the editable base deck.
2. python-pptx must post-process the generated PPTX to apply native gradient fills while preserving hyperlinks.
3. Locate target shapes by stable shape.name values.
4. Call fill.gradient() and set gradient_angle during post-processing.
5. Reuse the existing exposed gradient stop collection length.
6. Use two-stop gradients rather than attempting to insert or remove stops when the library exposes 2 stops.
7. Set line color and width for CTA and annual plan shapes where specified.
8. Save the post-processed PPTX as a separate output artifact.
9. Verify CTA shapes still have GRADIENT fill type and preserved WhatsApp hyperlinks after post-processing.
10. Confirm final rendering in PowerPoint COM.
11. Skip native table helper warnings on slide 10 because the helper misreports bounds in this environment.

### Examples
Example stable shapes are bg_canvas_s1, cta_demo_s1, cta_sales_s11, cta_sales_s12, and plan_anual_s11. Example gradient specs are background 145 degrees with 0D1520 -> 162232, CTA 0 degrees with 1ABC9C -> 2E86AB, and annual plan 0 degrees with 3D330B -> 7B650F. Example links include the WhatsApp demo URL, the WhatsApp sales URL with prefilled message, mailto:contato@uzzai.com.br, and https://uzzai.com.br.

## Facts
- **base_deck_builder**: The UzzApp commercial deck pipeline uses PptxGenJS to build the editable base deck. [project]
- **gradient_postprocessor**: python-pptx post-processes the generated PPTX to apply native gradient fills while preserving hyperlinks. [project]
- **runner_file**: The one-click runner file is docs/UzzApp apresentacao Luis/pptx-rebuild/rebuild-native-gradients.ps1. [project]
- **builder_file**: The builder script file is docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js. [project]
- **postprocess_file**: The post-processing script file is docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py. [project]
- **base_output_pptx**: The base output PPTX is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx. [project]
- **postprocessed_output_pptx**: The post-processed output PPTX is docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients.pptx. [project]
- **pipeline_flow**: The pipeline flow is build editable PPTX, reopen with python-pptx, apply native gradients to selected shapes, save a new PPTX, and verify gradients plus hyperlinks. [project]
- **cta_fill_type**: CTA shapes still have GRADIENT fill type after post-processing. [project]
- **cta_hyperlink_preservation**: CTA WhatsApp hyperlinks remain preserved after gradient post-processing. [project]
- **gradient_stop_count**: python-pptx exposes only the existing gradient stop collection length, which is 2 in this environment. [environment]
- **gradient_stop_rule**: The implementation must use two-stop gradients rather than attempting to insert or remove stops. [convention]
- **com_render_validation**: PowerPoint COM render confirmed the post-processed CTA renders as a clean native gradient without the previous layered-shape artifact. [project]
- **stable_shape_names**: Stable target shapes include bg_canvas_s1, cta_demo_s1, cta_sales_s11, cta_sales_s12, and plan_anual_s11. [project]
- **background_shape_range**: Background canvas names span bg_canvas_s1 through bg_canvas_s12 across the 12 slides. [project]
- **background_gradient_angle**: The background gradient angle is 145. [project]
- **background_gradient_colors**: The background gradient colors are 0D1520 to 162232. [project]
- **cta_gradient_angle**: The CTA gradient angle is 0. [project]
- **cta_gradient_colors**: The CTA gradient colors are 1ABC9C to 2E86AB. [project]
- **cta_line_style**: CTA border line color is 1ABC9C with width 1.25. [project]
- **annual_gradient_colors**: The annual plan gradient colors are 3D330B to 7B650F. [project]
- **annual_line_style**: Annual plan border line color is FFD700 with width 1.25. [project]
- **pptx_layout**: The builder deck metadata sets layout to LAYOUT_WIDE. [project]
- **deck_author**: The builder metadata author is OpenAI Codex. [project]
- **deck_company**: The builder metadata company is Uzz.Ai. [project]
- **deck_language**: The builder metadata language is pt-BR. [project]
- **deck_fonts**: The deck theme uses Poppins for headings and Inter for body text. [project]
- **demo_cta_url**: The demo CTA URL is a WhatsApp API send link for phone 5554992841942. [project]
- **sales_cta_url**: The sales CTA URL is a WhatsApp API send link with a prefilled Uzz.AI inquiry message. [project]
- **site_url**: The site link embedded in the deck is https://uzzai.com.br. [project]
- **email_url**: The email link embedded in the deck is mailto:contato@uzzai.com.br. [project]
- **slide_count**: The final PPTX contains 12 slides. [project]
- **monthly_price**: Slide 11 monthly price is R$ 247,00 per month. [project]
- **setup_fee**: Slide 11 setup fee is R$ 1.000,00. [project]
- **annual_price**: Slide 11 annual plan price is R$ 2.727 per year with one month free. [project]
- **contact_details**: Slide 12 includes contact email contato@uzzai.com.br and phone +55 54 99284-1942. [project]
- **deck_editability**: The base deck is editable. [project]
- **gradient_workaround_goal**: Native gradients are applied post-generation to avoid layered-shape artifacts while keeping clickable CTA behavior. [project]
- **slide10_warning_override**: Slide 10 skips native table helper warnings because bounds are misreported in this environment. [environment]
