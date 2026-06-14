---
children_hash: 8b21bf23352a3687f69085c623ebd28c721a8dc76e670a4ebf79423672d61a70
compression_ratio: 0.7126760563380282
condensation_order: 3
covers: [architecture/_index.md, facts/_index.md]
covers_token_total: 3905
summary_level: d3
token_count: 2783
type: summary
---
# d3 Structural Summary

## architecture
This domain consolidates the runtime decisions and product-state evolution for ChatBot-Oficial, with a strong emphasis on AI execution strategy and the UzzApp commercial deck pipeline.

### ai_runtime
See **`agent_framework_decision_for_realtime_flow.md`** and **`byterover_global_mode_cwd_requirement.md`** for the runtime rules that shape the customer-facing AI path.

- **Realtime execution path**: The primary flow is `incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`.
- **Framework posture**: Heavy agent frameworks such as LangChain, LangGraph, and Deep Agents are intentionally excluded from the realtime hot path and reserved for isolated async modules like internal automations, backoffice copilots, CRM, or classification tasks.
- **Operational constraints**: `callDirectAI()` depends on per-client Vault credential resolution, budget enforcement, usage tracking, and `getClientConfig()` overrides such as `enableTools`, `enableRAG`, and `enableHumanHandoff`.
- **Execution preference**: The runtime favors deterministic, fail-safe tool handling over framework abstraction.
- **ByteRover rule**: In this repo, ByteRover operates in global mode and every query/curation call must pass the repository cwd explicitly: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial`.

### project_state
See **`chatbot_oficial_snapshot_2026_03_31.md`**, **`theme_default_fallback_light_mode_2026_03_31.md`**, and the UzzApp deck-related entries for the dated product snapshot and export/rebuild evolution.

#### Repository and product snapshot
- **Current state**: ChatBot-Oficial is a production-active multi-tenant SaaS for WhatsApp customer service with AI.
- **Main stack**: Next.js 16, React 18, Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest.
- **Documentation drift**: `README.md` still reflects Next.js 14 while `package.json` indicates Next.js 16.
- **Recent delivery focus**: Meta/WhatsApp integration, including coexistence contact/history sync, unified multi-tenant webhook, SMB echoes, Embedded Signup onboarding, dashboard/settings work, and stronger logging/error handling.
- **Validation status**: 3 test suites / 10 tests passed; lint reported 0 errors and 12 warnings; build EPERM was treated as an environmental/sandbox issue.
- **Theme default**: `src/app/layout.tsx` changed `ThemeProvider defaultTheme` from `'dark'` to `'light'`, while preserving `enableSystem={false}`, `themes=['dark','light']`, and `storageKey='uzzapp-theme'`.

#### UzzApp deck export and PDF patterns
The deck work progresses through a consistent sequence: fixed-layout HTML export, live HTML PDF fidelity, export-only stabilization, then native PPTX rebuilds.

1. **Fixed-slide print-safe baseline**  
   See **`commercial_deck_mobile_pdf_export_pattern.md`**.  
   - Establishes a reusable `1280x720` slide layout.
   - Uses CSS scaling on screen and print-specific resets for dimensions, overflow, positioning, and page breaks.
   - `body.export-pdf` disables unstable effects such as glow pseudo-elements, gradient text clipping, blur, shadows, and transparency-heavy surfaces.
   - Export uses Puppeteer with `document.fonts.ready` and `page.pdf({ preferCSSPageSize: true })`.
   - Output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`, 12 pages.

2. **Live HTML PDF fidelity**  
   See **`uzzapp_deck_html_pdf_export_pattern_2026_04_02.md`**.  
   - Rejects screenshot-based export in favor of live selectable text and exact HTML visuals.
   - Uses Puppeteer screen media with export-only CSS enforcing fixed slide dimensions and print rules.
   - Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf`, 12 pages, text-extractable.

3. **Live HTML vs image PDF diagnosis**  
   See **`uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md`**.  
   - Compares live HTML PDF and image-based PDF behavior.
   - Diagnostic takeaway: if live HTML breaks on mobile but image PDF looks correct, the issue is likely mobile PDF viewer compatibility rather than missing assets.
   - Live HTML preserves text; image PDF has minimal extractable text.

4. **Export-only hybrid stabilization**  
   See **`uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md`**, **`uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md`**, and **`uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md`**.  
   - Preferred strategy: keep author-facing HTML intact and apply PDF-safe mutations only during export.
   - Initial mutations converted gradient text and CTA backgrounds to inline SVG and flattened unstable surfaces.
   - The minimal-override refinement preserves stable HTML styling and stabilizes only fragile layers.
   - CTA-light refinement simplifies CTA rendering to a solid brand green background and reduces `deviceScaleFactor` from 2 to 1.

5. **PDF-safe framework variant**  
   See **`uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md`**.  
   - Clones the HTML into a PDF-friendlier variant using inline SVG gradient text, SVG glow backgrounds, and static glass surfaces.
   - Live-html and image outputs remained 12 pages and text-extractable.

#### Native PPTX rebuild and gradient pipeline
The deck later shifts from HTML/PDF export to editable PowerPoint generation.

- **Image-based PPTX rebuild**: See **`uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md`**.  
  Builds a PPTX from slide PNGs using the OpenAI curated slides skill. The deck is image-based, not fully editable, and validation relied on PowerPoint COM because LibreOffice/`soffice` was unavailable.

- **Native editable PPTX**: See **`uzzapp_openai_slides_skill_pptx_rebuild.md`**.  
  Moves to a native `PptxGenJS` deck with editable text/shapes, layered approximations for unsupported gradients, and CTA buttons as native multi-shape components with hyperlink coverage preserved. Validation still uses PowerPoint COM, and slide 10 includes a `skipWarnings: true` exception for a false-positive table bounds warning.

- **Hybrid native-gradient pipeline**: See **`uzzapp_native_gradient_pptx_pipeline_2026_04_05.md`**.  
  Formalizes the workflow:
  1. `PptxGenJS` builds an editable base deck
  2. `python-pptx` post-processes stable named shapes with native gradients
  3. PowerShell runs the pipeline
  4. PowerPoint COM validates rendering  
  Key targets include `bg_canvas_s1` through `bg_canvas_s12`, `cta_demo_s1`, `cta_sales_s11`, `cta_sales_s12`, and `plan_anual_s11`. The pipeline depends on `shape.name` lookup, `fill.gradient()`, and two-stop gradients because the environment exposes only two gradient stops. CTA hyperlinks, including WhatsApp and slide 12 contact links, remain intact. Metadata includes `LAYOUT_WIDE`, author `OpenAI Codex`, company `Uzz.Ai`, language `pt-BR`, Poppins headings, Inter body, 12 slides, and pricing/contact facts.

- **HTML-background-aligned refinement**: See **`uzzapp_native_gradient_html_background_alignment_2026_04_05.md`**.  
  Improves the native gradient background using ZIP/XML post-processing to rewrite `bg_canvas_s*` gradients to a three-stop specification matching the HTML artwork. Adds `ALT_OUT` fallback for locked files and validates the final artifact `UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx`.

### Cross-entry pattern
Across the deck-related entries, the durable architectural preference is consistent:
- keep author-facing HTML high quality,
- move PDF/PPT accommodations into export-time transforms or post-processing,
- preserve text extractability, visual fidelity, editability, and hyperlinks,
- adapt to environment limits such as unavailable `soffice`, PowerPoint file locks, and `python-pptx` gradient-stop limitations.

## facts
This domain captures repository-level factual knowledge, operational constraints, and durable project metadata. It is centered on ByteRover workflow rules, the project snapshot, and the UzzApp commercial deck export/PPTX pipeline.

### Repository operation and ByteRover conventions
See **`initial_byterover_repository_sanity_check.md`** and **`byterover_cwd_requirement_for_repository.md`**.

- Start tasks with a ByteRover query and curate meaningful knowledge when completing significant work.
- The initial project-scoped query found no prior curated knowledge for the working directory.
- ByteRover MCP calls in this repo must use the explicit cwd `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial` because the server runs in global mode.
- Together these entries define the expected operational pattern: cwd-specific ByteRover usage with curation as part of the workflow.

### Project snapshot and baseline facts
See **`chatbot_oficial_state_facts_2026_03_31.md`** and **`theme_fallback_default_light_2026_03_31.md`**.

- The repository is a multi-tenant WhatsApp AI SaaS built with Next.js 16 + React 18.
- Core dependencies include Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, and Jest.
- Validation status includes passing tests, lint warnings, and a README/package.json version drift.
- Recent work focused on Meta/WhatsApp integration, webhook unification, Embedded Signup, dashboard/settings, and logging/error handling.
- Unsaved users fall back to light mode, the preference key is `uzzapp-theme`, and system theme auto-detection is disabled.

### Commercial deck export pipeline and rebuild facts
See the deck-related facts entries for the implementation-level details behind the architecture summaries above.

- **HTML/PDF export path**: fixed `1280x720` layout, mobile-friendly scaling, print overrides, export-only PDF-safe behavior, Puppeteer-based export, and a 12-page PDF output.
- **Export comparisons and stabilization**: screen-media Puppeteer strategy, `emulateMediaType('screen')`, `document.fonts.ready`, exact-fidelity rules, 12-page text-extractable PDFs, live HTML vs image diagnostics, PDF-safe SVG/glass substitutions, and export-only hybrid mutation patterns.
- **Native editable PPTX rebuild**: PptxGenJS-based editable PowerPoint, native shapes, round-rect CTA buttons with hyperlinks, PowerPoint COM validation, and embedded pricing values.
- **Hybrid native gradient pipeline**: editable base deck, python-pptx gradient post-processing, stable shape names, gradient colors/angles, CTA and annual-plan line styles, font stack, embedded URLs, and 12-slide output.
- **HTML-aligned gradient refinement**: three-stop background matching, ZIP/XML post-processing due to python-pptx two-stop limits, `ALT_OUT` fallback for locked files, and the validated final artifact path.

### Cross-cutting pattern
The deck work consistently distinguishes between:
- author-facing HTML,
- export-only PDF transformations,
- native editable PPTX generation.

Recurring technical themes include:
- preserving selectable text where needed,
- stabilizing fragile visual constructs during export,
- using exact viewport/layout dimensions like `1280x720`,
- validating outputs with measurable metrics such as page count and text length,
- preserving clickable WhatsApp, site, and email links through export and rebuild stages.