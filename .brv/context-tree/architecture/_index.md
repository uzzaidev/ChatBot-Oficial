---
children_hash: dee965d5aeb8eea0fc2c7e425e3857fb130d95874454fc6d21d942bf86d77eee
compression_ratio: 0.4697751186300805
condensation_order: 2
covers: [ai_runtime/_index.md, context.md, project_state/_index.md]
covers_token_total: 4847
summary_level: d2
token_count: 2277
type: summary
---
# d2 Structural Summary

## architecture / ai_runtime
This topic captures the runtime strategy for ChatBot-Oficial’s AI execution path and the ByteRover repository-operation constraint.

- **Realtime AI path**: The primary customer-facing flow normalizes AI execution through `callDirectAI()`, following the sequence: incoming webhook → flow routing → serverless node pipeline → `callDirectAI()` → explicit tool processing/handoff → response.
- **Framework decision**: Heavy agent frameworks such as LangChain, LangGraph, and Deep Agents are intentionally excluded from the realtime hot path. They are reserved for isolated async modules like internal automations, backoffice copilots, CRM, or classification tasks.
- **Runtime constraints**: `callDirectAI()` depends on per-client Vault credential resolution, budget enforcement, usage tracking, and `getClientConfig()` overrides such as `enableTools`, `enableRAG`, and `enableHumanHandoff`. The system favors deterministic, fail-safe tool handling over framework abstraction.
- **ByteRover MCP operational rule**: In this environment, ByteRover runs in global mode and every query/curation call must pass the repository cwd explicitly. The required cwd is `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial`.

Drill down:
- `agent_framework_decision_for_realtime_flow.md` — realtime flow, framework choice, ADR-006 alignment, and `callDirectAI()`
- `byterover_global_mode_cwd_requirement.md` — explicit cwd requirement for ByteRover MCP operations
- `context.md` — architecture domain scope and usage

## project_state / project_state
This topic documents the dated product-state snapshot plus the evolution of the UzzApp deck export and rebuild pipeline.

### Repository and product snapshot
- **Current app state**: ChatBot-Oficial is a production-active multi-tenant SaaS for WhatsApp customer service with AI.
- **Main stack**: Next.js 16, React 18, Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest.
- **Documentation drift**: `README.md` still describes Next.js 14 while `package.json` indicates Next.js 16.
- **Recent delivery focus**: Meta/WhatsApp integration, including coexistence contact/history sync, unified multi-tenant webhook, SMB echoes, Embedded Signup onboarding, dashboard/settings work, and stronger logging/error handling.
- **Validation status**: 3 test suites / 10 tests passed; lint reported 0 errors and 12 warnings; build EPERM was treated as an environmental/sandbox issue.
- **Theme change**: `src/app/layout.tsx` changed `ThemeProvider defaultTheme` from `'dark'` to `'light'`, while preserving `enableSystem={false}`, `themes=['dark','light']`, and `storageKey='uzzapp-theme'`.

### UzzApp deck export and PDF patterns
The deck work follows a clear progression from fixed-layout HTML export to export-only stabilization and finally to native PPTX rebuilds.

1. **Fixed-slide print-safe baseline**
   - `commercial_deck_mobile_pdf_export_pattern.md` establishes a reusable 1280x720 slide pattern.
   - Slides are scaled on screen using CSS `transform: scale(var(--deck-scale))`, while `@media print` resets dimensions, overflow, positioning, and page breaks.
   - `body.export-pdf` disables unstable visual effects like glow pseudo-elements, gradient text clipping, blur, shadows, and transparency-heavy surfaces.
   - Export script: `scripts/export-uzzapp-commercial-pdf.js` using Puppeteer, print media, `document.fonts.ready`, and `page.pdf({ preferCSSPageSize: true })`.
   - Output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`, 12 pages.

2. **Live HTML PDF fidelity**
   - `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md` rejects screenshot-based export in favor of live selectable text and exact HTML visuals.
   - Uses Puppeteer screen media with export-only CSS enforcing fixed slide dimensions and print rules.
   - Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf`, 12 pages, text-extractable.

3. **Live HTML vs image PDF diagnosis**
   - `uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md` compares live HTML PDF and image-based PDF behavior.
   - Diagnostic takeaway: if live HTML breaks on mobile but image PDF looks correct, the likely issue is mobile PDF viewer compatibility, not missing assets.
   - Output comparison: live HTML preserves text; image PDF has minimal extractable text.

4. **Export-only hybrid stabilization**
   - `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md` defines the preferred strategy: keep author-facing HTML intact and apply PDF-safe mutations only during export.
   - Initial export mutations converted gradient text and CTA backgrounds to inline SVG and flattened unstable surfaces.
   - `uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md` refines this by preserving stable HTML styling and stabilizing only fragile layers.
   - `uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md` further simplifies CTA rendering to a solid brand green background and reduces `deviceScaleFactor` from 2 to 1 for a lighter PDF.

5. **PDF-safe framework variant**
   - `uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md` clones the HTML into a PDF-friendlier variant using inline SVG gradient text, SVG glow backgrounds, and static glass surfaces.
   - Both live-html and image outputs remained 12 pages and text-extractable.

### Native PPTX rebuild and gradient pipeline
The deck later shifts from HTML/PDF export to editable PowerPoint generation.

- **Image-based PPTX rebuild**: `uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md` uses the OpenAI curated slides skill to assemble a PPTX from slide PNGs. The deck is image-based, not fully editable, and validation relied on PowerPoint COM because LibreOffice/`soffice` was unavailable.
- **Native editable PPTX**: `uzzapp_openai_slides_skill_pptx_rebuild.md` moves to a native `PptxGenJS` deck with editable text/shapes, layered approximations for unsupported gradients, and CTA buttons implemented as native multi-shape components with hyperlink coverage preserved. Validation still uses PowerPoint COM, and slide 10 includes a `skipWarnings: true` exception for a false-positive table bounds warning.
- **Hybrid native-gradient pipeline**: `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md` formalizes the workflow:
  1. `PptxGenJS` builds an editable base deck
  2. `python-pptx` post-processes stable named shapes with native gradients
  3. PowerShell runs the pipeline
  4. PowerPoint COM validates rendering
  - Key targets include `bg_canvas_s1` through `bg_canvas_s12`, `cta_demo_s1`, `cta_sales_s11`, `cta_sales_s12`, and `plan_anual_s11`.
  - The pipeline depends on `shape.name` lookup, `fill.gradient()`, and two-stop gradients because the environment exposes only two gradient stops.
  - CTA hyperlinks, including WhatsApp and slide 12 contact links, remain intact.
  - Deck metadata includes `LAYOUT_WIDE`, author `OpenAI Codex`, company `Uzz.Ai`, language `pt-BR`, Poppins headings, Inter body, 12 slides, and pricing/contact facts.
- **HTML-background-aligned refinement**: `uzzapp_native_gradient_html_background_alignment_2026_04_05.md` improves the native gradient background using ZIP/XML post-processing to rewrite `bg_canvas_s*` gradients to a three-stop specification matching the HTML artwork. It adds `ALT_OUT` fallback for locked files and validates the final artifact `UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx`.

### Cross-entry pattern
Across all deck-related entries, the durable architectural preference is consistent:
- keep author-facing HTML high quality
- move PDF/PPT accommodations into export-time transforms or post-processing
- preserve text extractability, visual fidelity, editability, and hyperlinks
- adapt to environment limits such as unavailable `soffice`, PowerPoint file locks, and `python-pptx` gradient-stop limitations

Drill down:
- `chatbot_oficial_snapshot_2026_03_31.md` — app snapshot, stack, validation state, and repo drift
- `theme_default_fallback_light_mode_2026_03_31.md` — theme default change to light mode
- `commercial_deck_mobile_pdf_export_pattern.md` — fixed-slide print-safe PDF baseline
- `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md` — live HTML PDF export pattern
- `uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md` — live vs image PDF comparison
- `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md` — export-only hybrid approach
- `uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md` — reduced override refinement
- `uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md` — CTA-light PDF refinement
- `uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md` — PDF-safe HTML variant
- `uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md` — image-based PPTX rebuild
- `uzzapp_openai_slides_skill_pptx_rebuild.md` — native editable PPTX rebuild
- `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md` — hybrid native-gradient pipeline
- `uzzapp_native_gradient_html_background_alignment_2026_04_05.md` — HTML-aligned native gradient refinement
- `context.md` — project_state domain scope and usage