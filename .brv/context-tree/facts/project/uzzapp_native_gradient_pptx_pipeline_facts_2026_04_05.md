---
title: UzzApp Native Gradient PPTX Pipeline Facts 2026 04 05
tags: []
related: [architecture/project_state/uzzapp_native_gradient_pptx_pipeline_2026_04_05.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T12:42:30.330Z'
updatedAt: '2026-04-05T12:42:30.330Z'
---
## Raw Concept
**Task:**
Capture concrete facts about the UzzApp native-gradient PowerPoint deck pipeline and output artifacts

**Changes:**
- Captured file paths for builder, post-processor, and runner
- Captured gradient values, shape names, and output facts
- Captured pricing and preserved link details from the deck

**Files:**
- docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js
- docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py
- docs/UzzApp apresentacao Luis/pptx-rebuild/rebuild-native-gradients.ps1

**Flow:**
single-pass RLM context analysis -> fact extraction -> dedup/group by subject -> curate into facts/project for recall

**Timestamp:** 2026-04-05

## Narrative
### Structure
This facts entry stores the implementation-level values for the UzzApp native-gradient PowerPoint workflow, including file locations, output filenames, shape identifiers, URLs, pricing values, gradient settings, and final deck state.

### Dependencies
These facts are tied to the current hybrid workflow that combines PptxGenJS generation and python-pptx mutation, and they assume the existing stable shape names in the generated deck.

### Highlights
The highest-value recall items are that the deck remains editable, the final output has 12 slides, CTA WhatsApp links survive post-processing, slide 12 embeds email and site links, and native gradients are used specifically to eliminate layered-shape rendering artifacts.

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
