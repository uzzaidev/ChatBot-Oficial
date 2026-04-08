---
children_hash: 7eb5eb726e33dc83fb1be9836a6262948b1ed38369e72e6ce6a5770b1048657a
compression_ratio: 0.7093653250773994
condensation_order: 2
covers: [ai_runtime/_index.md, context.md, project_state/_index.md]
covers_token_total: 5168
summary_level: d2
token_count: 3666
type: summary
---
# architecture

## Domain scope
The `architecture` domain documents runtime behavior, AI execution paths, framework-selection constraints, and dated architectural/project-state decisions that affect how ChatBot-Oficial operates. It excludes general product-management notes and customer-specific configuration without architectural impact. See `context.md`.

## Topic: ai_runtime
Covers the platform’s AI execution model for realtime customer-facing flows and the constraints around agent/framework adoption. Drill into `agent_framework_decision_for_realtime_flow.md` and `byterover_global_mode_cwd_requirement.md`.

### Core runtime decision
- ChatBot-Oficial is a **multi-tenant WhatsApp SaaS** on **Next.js**.
- Realtime execution is intentionally bounded:
  - `incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`
- The platform’s main runtime is **`callDirectAI()`**, backed by an internal **13-node serverless pipeline**, not LangChain/LangGraph as the principal execution layer.

### What `callDirectAI()` standardizes
From `agent_framework_decision_for_realtime_flow.md`:
- provider access
- per-client credential resolution via Vault
- budget enforcement
- usage tracking
- tool-call normalization
- agent/config overrides through `getClientConfig()`

Noted runtime override dimensions:
- `prompt`
- `provider`
- `model`
- feature flags such as `enableTools`, `enableRAG`, `enableHumanHandoff`

### Architectural constraint
- Realtime WhatsApp atendimento flows require **predictable latency** and **fail-safe behavior**.
- Hot-path tools must stay **explicitly bounded** and deterministic.
- Example bounded tools: `transferir_atendimento`, `buscar_documento`.

### Framework boundary
From `agent_framework_decision_for_realtime_flow.md`:
- Heavy agent frameworks such as **Deep Agents** are **not** suitable as the core runtime for customer-facing realtime execution.
- They remain acceptable for:
  - asynchronous modules
  - internal automations
  - backoffice copilots
- Supporting guidance:
  - **ADR-006** favors reuse of `callDirectAI()`
  - **LangChain** remains optional for secondary workloads like CRM/classification

### Operational environment rule
From `byterover_global_mode_cwd_requirement.md`:
- ByteRover MCP runs in **global mode** for this repository.
- Every query/retrieve and curate/store call must pass:
  - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- This is documented as an environment-mode detail, not inherently an installation defect.
- Instruction sources updated: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`.

## Topic: project_state
Captures dated repository state plus the evolution of the UzzApp commercial deck export/rebuild pipeline. Drill into `chatbot_oficial_snapshot_2026_03_31.md`, `theme_default_fallback_light_mode_2026_03_31.md`, and the `uzzapp_*` / `commercial_deck_*` entries.

### Repository snapshot and baseline app state
From `chatbot_oficial_snapshot_2026_03_31.md`:
- ChatBot-Oficial is a production-active **multi-tenant SaaS for WhatsApp customer service with AI**.
- Main stack: **Next.js 16**, **React 18**, Supabase, Stripe, Redis, AI SDK/OpenAI/Groq, Capacitor, Jest.
- Noted documentation drift:
  - `README.md` says **Next.js 14**
  - `package.json` indicates **Next.js 16**
- Recent product emphasis:
  - Meta/WhatsApp integration
  - coexistence contact/history sync
  - unified multi-tenant webhook
  - SMB echoes
  - Embedded Signup onboarding
  - dashboard/settings work
  - improved logging/error handling
- Validation snapshot:
  - **3 suites / 10 tests** passing
  - lint: **0 errors, 12 warnings**
  - build `EPERM` failure treated as environmental/sandbox-related
- Example modified-but-uncommitted files:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.github/copilot-instructions.md`
  - `UzzApp_Apresentacao_Comercial.html`

### Theme fallback decision
From `theme_default_fallback_light_mode_2026_03_31.md`:
- In `src/app/layout.tsx`, `ThemeProvider defaultTheme` changed from `'dark'` to `'light'`.
- Preserved config:
  - `enableSystem={false}`
  - `themes=['dark','light']`
  - `storageKey='uzzapp-theme'`
- Result: new/reset users default to **light mode**, while persisted preference still overrides.

## UzzApp deck architecture and export pipeline
The entries collectively describe a progression from HTML deck rendering to PDF-safe export adaptations and then to editable/native PPTX output.

### 1) Fixed-slide, print-safe HTML/PDF baseline
From `commercial_deck_mobile_pdf_export_pattern.md`:
- Source pattern for `docs/UzzApp_Apresentacao_Comercial_v2.html`
- Slides stay fixed at **1280x720**
- Screen scaling uses CSS variables + `transform: scale(var(--deck-scale))` instead of reflowing slide internals
- Print safety uses explicit `@media print` overrides for dimensions, overflow, positioning, `transform:none`, and page-break behavior
- `body.export-pdf` disables unstable visual effects such as glow pseudo-elements, gradient text clipping, blur, transparency-heavy shadows/notches
- Export script: `scripts/export-uzzapp-commercial-pdf.js`
  - Puppeteer viewport `1280x720`
  - `emulateMediaType("print")`
  - waits for `document.fonts.ready`
  - `page.pdf({ preferCSSPageSize: true })`
- Output: `docs/UzzApp_Apresentacao_Comercial_v2.pdf` with **12 pages**

### 2) Fidelity-first live HTML PDF
From `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md`:
- Rejected screenshot-first PDF as the primary path
- Preferred for fidelity-sensitive export: original HTML rendered by Puppeteer with **screen media**
- Export script: `scripts/export-uzzapp-luis-pdf.js`
- Source HTML: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html`
- Export characteristics:
  - viewport `1280x720`
  - `document.fonts.ready`
  - `emulateMediaType('screen')`
  - injected export CSS for `@page 1280x720`, zero margins, exact color printing, fixed slide geometry, page breaks
- Key decision: avoid export modes that flatten gradients/glows/device visuals when exact fidelity and selectable text matter
- Output:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf`
  - **12 pages**
  - `textLength 8043`
  - contains `UzzApp`, confirming extractable text

### 3) Diagnostic live-vs-image comparison
From `uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md`:
- Two comparison outputs:
  - live HTML PDF: `...v2.live-html.pdf`
  - image PDF: `...v2.image.pdf`
- Image pipeline script: `scripts/export-uzzapp-luis-image-pdf.js`
  - single-slide render mode
  - `Page.screenshot()` at `1280x720`
  - PNG output dir: `docs/UzzApp apresentacao Luis/output/image-pdf-slides`
- Diagnostic result:
  - both PDFs: **12 pages**
  - live HTML: `textLength 8043`, contains `UzzApp`
  - image PDF: `textLength 24`, no `UzzApp`
- Interpretation: if mobile breaks only on live HTML PDF, the likely cause is **viewer compatibility with live PDF constructs**, not missing assets.

### 4) Preferred export-only hybrid mutation strategy
From `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md`:
- Main reusable rule: keep marketing HTML intact for authoring; apply **PDF-safe CSS/DOM mutations only during Puppeteer export**
- Script: `scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js`
- `package.json` script added: `export:uzzapp-luis-exportonly-hybrid-pdf`
- Export-time transforms include:
  - gradient text -> inline SVG
  - CTA backgrounds -> inline SVG
  - flattening unstable cards/surfaces/device layers/blur-heavy overlays
- Output:
  - `...exportonly-hybrid.live-html.pdf`
  - **12 pages**
  - extractable text
  - `textLength 8214`
  - contains `UzzApp`

### 5) Minimal-override refinement
From `uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md`:
- First hybrid pass was too aggressive visually
- Revised approach preserves original styling for stable elements:
  - normal cards
  - stat pills
  - integration cards
  - CTA buttons
- Stabilizes only fragile pieces:
  - gradient text
  - blur/backdrop-filter overlays
  - bubble-ai surfaces
  - selected device/browser mockup layers
- Output:
  - `...exportonly-minimal.live-html.pdf`
  - **12 pages**
  - `textLength 8214`
  - contains `UzzApp`

### 6) CTA-light export refinement
From `uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md`:
- Export-only `.cta-btn` forced to solid brand green
- Removes unstable CTA gradient rendering
- `deviceScaleFactor` reduced from **2** to **1** to reduce file size
- Output:
  - `...exportonly-cta-light.live-html.pdf`
  - **12 pages**
  - `textLength 8214`
  - contains `UzzApp`
  - size ~**1.41 MB** vs ~**1.43 MB**

### 7) PDF-safe framework variant
From `uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md`:
- Experimental cloned HTML: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.html`
- Goal: replace unstable CSS constructs with PDF-friendlier primitives while preserving author-facing structure
- Reusable strategies:
  - `.gradient-text` -> inline SVG gradient text after `document.fonts.ready`
  - radial-gradient glow pseudo-elements -> SVG data URI backgrounds
  - `backdrop-filter` surfaces -> static `glass-card` / `glass-pill` gradients and borders
  - extended print color-adjust rules
- Outputs:
  - `..._pdfsafe.live-html.pdf`
  - `..._pdfsafe.image.pdf`
  - both **12 pages**
- Live variant preserved extractable text with `textLength 8214`

## PPTX rebuild evolution

### Image-based PPTX reconstruction
From `uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md`:
- Uses installed OpenAI curated slides skill
- Workspace: `docs/UzzApp apresentacao Luis/pptx-rebuild`
- Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pptx`
- Built from existing slide PNGs in `output/image-pdf-slides`
- Result is **image-based**, not fully native-editable
- Validation used **PowerPoint COM automation** because `soffice` / LibreOffice was unavailable
- Limited dependency choice: `pptxgenjs_helpers/layout`
- Output state: about **13.46 MB**, **12 slides**

### Native editable PPTX rebuild
From `uzzapp_openai_slides_skill_pptx_rebuild.md`:
- Shift from image reconstruction to **native editable PowerPoint** with `PptxGenJS`
- Builder: `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`
- Output: `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx`
- Key decisions:
  - keep deck editable with native text/shapes
  - approximate unsupported HTML gradients with layered semi-transparent native shapes
  - CTA buttons built as native round-rect multi-shape components with hyperlink coverage on shapes and text
  - visual PNG render validation is the source of truth
- Special handling:
  - `finish(s, 10, { skipWarnings: true });` for false-positive table bounds warnings on slide 10

### Hybrid native-gradient editable pipeline
From `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md`:
- Main workflow:
  1. `PptxGenJS` builds editable base deck
  2. `python-pptx` reopens deck and applies native gradients to named shapes
  3. PowerShell wrapper orchestrates both
  4. PowerPoint COM validates rendering
- Files:
  - `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`
  - `docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py`
  - `docs/UzzApp apresentacao Luis/pptx-rebuild/rebuild-native-gradients.ps1`
- Outputs:
  - `..._editable_native.pptx`
  - `..._editable_native_gradients.pptx`
- Decision: use **post-generation native gradients** to remove layered-shape artifacts while preserving editability and hyperlinks
- Stable named targets:
  - `bg_canvas_s1` ... `bg_canvas_s12`
  - `cta_demo_s1`
  - `cta_sales_s11`
  - `cta_sales_s12`
  - `plan_anual_s11`
- Rules/patterns:
  - identify targets by `shape.name`
  - call `fill.gradient()`
  - set `gradient_angle`
  - reuse exposed stop collection
  - environment limitation: only **2 stops** exposed in `python-pptx`
- Validation/error pattern:
  - `Gradient stop count mismatch for {shape.name}: library exposes {len(stops)} stops, requested {len(stops_spec)}`
- Preserved outcomes:
  - CTA shapes keep `GRADIENT` fill type
  - WhatsApp CTA hyperlinks remain intact
  - slide 12 retains `mailto:contato@uzzai.com.br` and `https://uzzai.com.br`
- Metadata/facts:
  - `LAYOUT_WIDE`
  - author `OpenAI Codex`
  - company `Uzz.Ai`
  - language `pt-BR`
  - fonts: **Poppins** headings, **Inter** body
  - **12 slides**
  - slide 11 pricing: **R$ 247,00/mês**, **R$ 1.000,00** setup, **R$ 2.727/ano**
  - contact: `contato@uzzai.com.br`, `+55 54 99284-1942`

### HTML-background-aligned native gradient refinement
From `uzzapp_native_gradient_html_background_alignment_2026_04_05.md`:
- Refines the gradient pipeline to better match original HTML backgrounds
- Keeps `python-pptx` first pass, then ZIP/XML post-processing
- `postprocess-native-gradients.py` rewrites `bg_canvas_s*` `gradFill gsLst` to a **3-stop gradient**:
  - `0D1520` at 0%
  - `162232` at 50%
  - `0D1A28` at 100%
- Motivation: bypass the 2-stop exposure limit in `python-pptx`
- Adds **ALT_OUT** fallback when the main PPTX is locked by PowerPoint
- Validated artifact:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx`
- Validation render dir:
  - `docs/UzzApp apresentacao Luis/pptx-rebuild/rendered-ppt-native-gradients-htmlbg`

## Cross-entry structural patterns
Across `commercial_deck_mobile_pdf_export_pattern.md`, `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md`, `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md`, `uzzapp_openai_slides_skill_pptx_rebuild.md`, and the native-gradient entries:

- Strong preference to keep **author-facing HTML** visually rich and unchanged for editing
- Push compatibility fixes into:
  - **export-time transforms** for PDF
  - **post-processing** for PPTX
- Repeated quality goals:
  - preserve **text extractability** in PDFs
  - preserve **visual fidelity**
  - preserve **editability** in PPTX
  - preserve **hyperlinks** and CTA behavior
- Repeated environment constraints:
  - `soffice` unavailable
  - **PowerPoint COM** used as validation fallback
  - `python-pptx` gradient-stop limitation required lower-level XML editing
  - open PowerPoint can lock output files, requiring `ALT_OUT`

## Relationships
- `ai_runtime` documents core runtime and framework boundaries for production AI execution.
- `project_state` records dated repository and delivery-state decisions, especially the UzzApp presentation/export architecture.
- `project_state` complements but does not replace normalized factual references in `facts/project/*`.