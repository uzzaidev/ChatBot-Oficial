---
children_hash: 5471f049ece2e57a5ed276b12c92a463ca45f0604321338cadea29cd792308e3
compression_ratio: 0.5563920065699425
condensation_order: 3
covers: [architecture/_index.md, facts/_index.md]
covers_token_total: 7306
summary_level: d3
token_count: 4065
type: summary
---
# Structural Summary

## Top-level domains
The provided entries split into two complementary domains:

- `architecture/_index.md` — architectural decisions, runtime boundaries, and dated project-state design choices.
- `facts/_index.md` — durable repository facts, environment constraints, validation outcomes, and stable operational/product metadata.

Together they describe:
1. how ChatBot-Oficial is architected and constrained in production,
2. what the repository/runtime environment requires,
3. how the UzzApp HTML → PDF → PPTX pipeline evolved.

---

## 1) Runtime architecture and operating boundaries

### Core platform model
From `architecture/_index.md`:
- ChatBot-Oficial is a **multi-tenant WhatsApp SaaS** built on **Next.js**.
- Production AI execution is centered on **`callDirectAI()`**, not a heavyweight agent framework.
- Main hot path is intentionally bounded:

`incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`

### `callDirectAI()` responsibility boundary
Referenced in `agent_framework_decision_for_realtime_flow.md`:
- provider access
- per-client credential resolution via Vault
- budget enforcement
- usage tracking
- tool-call normalization
- tenant/runtime overrides through `getClientConfig()`

Important override dimensions:
- `prompt`
- `provider`
- `model`
- feature flags like `enableTools`, `enableRAG`, `enableHumanHandoff`

### Framework decision
From `agent_framework_decision_for_realtime_flow.md`:
- Realtime WhatsApp flows prioritize **predictable latency** and **fail-safe behavior**.
- Heavy agent frameworks such as **Deep Agents** are explicitly **not** the core runtime for customer-facing execution.
- Acceptable uses for those frameworks remain:
  - asynchronous modules
  - internal automations
  - backoffice copilots
- `ADR-006` reinforces reuse of `callDirectAI()`.
- `LangChain` is treated as optional/secondary for workloads like CRM or classification.

### Operational environment rule
Shared across `byterover_global_mode_cwd_requirement.md` and `byterover_cwd_requirement_for_repository.md`:
- ByteRover MCP is running in **global mode**.
- Repository-scoped calls must use:

`C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial`

This is a stable environment constraint, not an installation defect. Related instruction sources include `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.

---

## 2) Repository/project state baseline

### Product and stack snapshot
Across `chatbot_oficial_snapshot_2026_03_31.md` and `chatbot_oficial_state_facts_2026_03_31.md`:
- ChatBot-Oficial is a production-active **multi-tenant WhatsApp customer-service SaaS with AI**.
- Stack includes:
  - `Next.js 16`
  - `React 18`
  - `Supabase`
  - `Stripe`
  - `Redis`
  - `AI SDK / OpenAI / Groq`
  - `Capacitor`
  - `Jest`

### Validation and doc drift
Same entries record:
- tests: **3 suites / 10 tests passing**
- lint: **0 errors, 12 warnings**
- build `EPERM` failure treated as environment/sandbox-related
- documentation drift:
  - `README.md` says **Next.js 14**
  - `package.json` indicates **Next.js 16**

### Recent implementation emphasis
Referenced in both architecture/facts summaries:
- Meta/WhatsApp integration
- coexistence contact/history sync
- unified multi-tenant webhook
- SMB echoes
- Embedded Signup onboarding
- dashboard/settings work
- improved logging and error handling

### Theme default decision
From `theme_default_fallback_light_mode_2026_03_31.md` and `theme_fallback_default_light_2026_03_31.md`:
- `src/app/layout.tsx` changed `ThemeProvider defaultTheme` from `'dark'` to `'light'`.
- Preserved:
  - `enableSystem={false}`
  - `themes=['dark','light']`
  - `storageKey='uzzapp-theme'`
- Result: default fallback is **light mode** when no saved preference exists.

---

## 3) UzzApp PDF export architecture evolution

This is the strongest cross-entry cluster, spanning `commercial_deck_*`, `uzzapp_deck_*`, and PPTX entries.

### A. Print-safe HTML/PDF baseline
From `commercial_deck_mobile_pdf_export_pattern.md` and `commercial_deck_export_facts_2026_03_31.md`:
- Source:
  - `docs/UzzApp_Apresentacao_Comercial_v2.html`
- Export script:
  - `scripts/export-uzzapp-commercial-pdf.js`
- Output:
  - `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
- Baseline export invariants:
  - fixed slide geometry `1280x720`
  - `emulateMediaType("print")`
  - wait for `document.fonts.ready`
  - `page.pdf({ preferCSSPageSize: true })`
  - `body.export-pdf`
- Output result: **12 pages**

This phase focused on print hardening and safe rendering under print media.

### B. Shift to fidelity-first live HTML PDF
From `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md` and `uzzapp_deck_export_facts_2026_04_02.md`:
- Source:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.html`
- Script:
  - `scripts/export-uzzapp-luis-pdf.js`
- Output:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pdf`
- Key decision:
  - reject screenshot-first export as primary path
  - prefer original HTML rendered by Puppeteer with **screen media**
- Validation:
  - **12 pages**
  - `textLength 8043`
  - contains `UzzApp`

This established the architectural preference for preserving **visual fidelity + selectable text**.

### C. Diagnostic comparison path
From `uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md` and `uzzapp_deck_comparison_export_facts_2026_04_02.md`:
- Comparison outputs:
  - `...v2.live-html.pdf`
  - `...v2.image.pdf`
- Image pipeline script:
  - `scripts/export-uzzapp-luis-image-pdf.js`
- PNG output dir:
  - `docs/UzzApp apresentacao Luis/output/image-pdf-slides`

Diagnostic findings:
- both outputs had **12 pages**
- live HTML PDF:
  - `textLength 8043`
  - contains `UzzApp`
- image PDF:
  - `textLength 24`
  - does not contain `UzzApp`

Architectural interpretation:
- if mobile rendering breaks only on live HTML PDF, likely cause is **PDF viewer compatibility**, not missing assets.

---

## 4) Preferred PDF stabilization pattern: export-only hybrid

### PDF-safe clone as transitional strategy
From `uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md` and `uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md`:
- Cloned source:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_pdfsafe.html`
- Techniques:
  - `.gradient-text` → inline SVG
  - glow pseudo-elements → SVG data URIs
  - blur/backdrop surfaces → static glass variants
  - stronger print color-adjust rules
- Outputs:
  - `..._pdfsafe.live-html.pdf`
  - `..._pdfsafe.image.pdf`
- Live PDF preserved extractable text:
  - `textLength 8214`
  - **12 pages**

This proved that fragile visual features could be replaced with PDF-friendlier constructs.

### Export-only hybrid becomes the reusable rule
From `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md` and `uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md`:
- Script:
  - `scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js`
- `package.json` command:
  - `export:uzzapp-luis-exportonly-hybrid-pdf`
- Output:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf`

Main architectural decision:
- keep author-facing HTML intact
- apply PDF-safe CSS/DOM mutations **only during Puppeteer export**

Export-time transformations include:
- gradient text → inline SVG
- CTA backgrounds → inline SVG
- flatten unstable surfaces/layers/blur-heavy overlays only during export

Validation:
- **12 pages**
- extractable text
- `textLength 8214`
- contains `UzzApp`

### Minimal override refinement
From `uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md` and corresponding facts entry:
- Preserves original styling for stable elements:
  - cards
  - stat pills
  - integration cards
  - CTA buttons
- Stabilizes only fragile elements:
  - gradient text
  - blur/backdrop overlays
  - bubble-ai surfaces
  - selected mockup/device layers

Output:
- `...exportonly-minimal.live-html.pdf`
- **12 pages**
- `textLength 8214`

### CTA-specific targeted fix
From `uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md` and `uzzapp_deck_export_cta_light_facts_2026_04_02.md`:
- Export forces `.cta-btn` to solid brand green
- `deviceScaleFactor` reduced from `2` to `1`
- Output:
  - `...exportonly-cta-light.live-html.pdf`
- Validation:
  - **12 pages**
  - `textLength 8214`
  - contains `UzzApp`
  - approx. **1.41 MB**

### Pattern across the PDF entries
The export strategy clearly evolves as:

`print-safe baseline`  
→ `live HTML fidelity-first PDF`  
→ `pdfsafe clone`  
→ `export-only hybrid`  
→ `minimal override hybrid`  
→ `CTA-specific targeted override`

The dominant architectural preference is:
- preserve rich authoring HTML,
- move compatibility fixes to **export-time only**,
- retain **extractable text** and branded fidelity.

---

## 5) PPTX rebuild evolution

### A. Image-based PPTX reconstruction
From `uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md`:
- Uses OpenAI curated slides skill
- Workspace:
  - `docs/UzzApp apresentacao Luis/pptx-rebuild`
- Output:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2.pptx`
- Source imagery:
  - existing slide PNGs in `output/image-pdf-slides`
- Result:
  - image-based
  - not fully native-editable
  - about **13.46 MB**
  - **12 slides**
- Validation used **PowerPoint COM automation** because `soffice`/LibreOffice was unavailable

This was a functional but non-ideal bridge step.

### B. Native editable PPTX
From `uzzapp_openai_slides_skill_pptx_rebuild.md` and `uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md`:
- Builder:
  - `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`
- Output:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native.pptx`
- Library:
  - `PptxGenJS`

Key decisions:
- preserve **editability** with native text and native shapes
- approximate unsupported HTML gradients with layered semi-transparent shapes
- build CTA buttons as native round-rect multi-shape components
- preserve hyperlink coverage on both shapes and text
- PNG render validation is source of truth

Special note:
- `finish(s, 10, { skipWarnings: true });` used for false-positive slide 10 table bounds warnings

Embedded facts preserved in related entries:
- **12 slides**
- pricing on slide 11:
  - `R$ 247,00/mês`
  - `R$ 1.000,00` setup
  - `R$ 2.727/ano`

### C. Native gradient post-processing pipeline
From `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md` and `uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md`:
- Files:
  - `build-uzzapp-ppt.js`
  - `postprocess-native-gradients.py`
  - `rebuild-native-gradients.ps1`
- Flow:
  1. `PptxGenJS` builds editable base deck
  2. `python-pptx` reopens deck
  3. native gradients applied to named shapes
  4. PowerShell wrapper orchestrates
  5. PowerPoint COM validates rendering

Artifacts:
- `..._editable_native.pptx`
- `..._editable_native_gradients.pptx`

Stable shape targeting by `shape.name`:
- `bg_canvas_s1` ... `bg_canvas_s12`
- `cta_demo_s1`
- `cta_sales_s11`
- `cta_sales_s12`
- `plan_anual_s11`

Gradient/application rules:
- use `fill.gradient()`
- set `gradient_angle`
- reuse exposed stop collection

Important limitation:
- `python-pptx` exposes only **2 gradient stops**

Error/validation pattern:
- `Gradient stop count mismatch for {shape.name}: library exposes {len(stops)} stops, requested {len(stops_spec)}`

Preserved metadata/facts:
- `LAYOUT_WIDE`
- author `OpenAI Codex`
- company `Uzz.Ai`
- language `pt-BR`
- fonts: `Poppins`, `Inter`
- slide 12 links:
  - `mailto:contato@uzzai.com.br`
  - `https://uzzai.com.br`
- contact:
  - `contato@uzzai.com.br`
  - `+55 54 99284-1942`

### D. HTML-background aligned refinement
From `uzzapp_native_gradient_html_background_alignment_2026_04_05.md` and corresponding facts entry:
- Refines the gradient pipeline to match original HTML background more closely
- `postprocess-native-gradients.py` rewrites `bg_canvas_s*` XML `gradFill gsLst` to a **3-stop** gradient:
  - `0D1520` at `0%`
  - `162232` at `50%`
  - `0D1A28` at `100%`
- Reason:
  - bypass `python-pptx` 2-stop limitation with ZIP/XML post-processing
- Adds `ALT_OUT` fallback if PowerPoint locks the primary output
- Validated artifact:
  - `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2_editable_native_gradients_htmlbg.pptx`

### PPTX evolution pattern
The PPTX architecture progresses as:

`image-based reconstruction`  
→ `native editable PPTX with PptxGenJS`  
→ `python-pptx native gradient enhancement`  
→ `ZIP/XML 3-stop gradient correction aligned to HTML backgrounds`

The repeated design goal is to preserve:
- editability,
- visual fidelity,
- clickable CTAs/hyperlinks,
- validation fidelity through PowerPoint rendering.

---

## 6) Cross-domain patterns and relationships

### Architecture ↔ facts relationship
- `architecture/_index.md` captures **why** the system is designed this way.
- `facts/_index.md` captures **what is stably true** about environment, outputs, validation, and repo state.

### Stable invariants across entries
Referenced repeatedly in both domain summaries:
- repository operations are **cwd-sensitive**
- environment limitations are treated as operational constraints:
  - `EPERM spawn`
  - unavailable `soffice`
  - PowerPoint file locking
  - `python-pptx` gradient-stop limit
- deck geometry standard is **`1280x720`**
- output count standard is **12 pages / 12 slides**
- PDF success criteria include:
  - extractable/selectable text
  - string-presence checks such as `UzzApp`
  - `pdf-parse` metrics like `textLength`
- PPTX success criteria include:
  - native editability
  - preserved hyperlinks
  - PowerPoint COM visual validation

### Repeated architectural preference
Across `commercial_deck_mobile_pdf_export_pattern.md`, `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md`, `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md`, `uzzapp_openai_slides_skill_pptx_rebuild.md`, `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md`, and `uzzapp_native_gradient_html_background_alignment_2026_04_05.md`:

- keep the **author-facing HTML** visually rich and minimally disturbed
- push compatibility fixes into:
  - **export-time transforms** for PDF
  - **post-processing** for PPTX
- preserve:
  - branded gradients/glows/CTA appearance
  - text extractability in PDFs
  - editability in PowerPoint
  - hyperlinks and CTA behavior

---

## Drill-down map

### Runtime and environment
- `agent_framework_decision_for_realtime_flow.md`
- `byterover_global_mode_cwd_requirement.md`
- `byterover_cwd_requirement_for_repository.md`
- `initial_byterover_repository_sanity_check.md`

### Repo state and product baseline
- `chatbot_oficial_snapshot_2026_03_31.md`
- `chatbot_oficial_state_facts_2026_03_31.md`
- `theme_default_fallback_light_mode_2026_03_31.md`
- `theme_fallback_default_light_2026_03_31.md`

### HTML/PDF export path
- `commercial_deck_mobile_pdf_export_pattern.md`
- `commercial_deck_export_facts_2026_03_31.md`
- `uzzapp_deck_html_pdf_export_pattern_2026_04_02.md`
- `uzzapp_deck_export_facts_2026_04_02.md`
- `uzzapp_deck_live_html_vs_image_pdf_comparison_pattern.md`
- `uzzapp_deck_comparison_export_facts_2026_04_02.md`

### Export-only hybrid refinements
- `uzzapp_deck_pdf_safe_framework_variant_2026_04_02.md`
- `uzzapp_deck_pdf_safe_variant_facts_2026_04_02.md`
- `uzzapp_deck_export_only_hybrid_pdf_pattern_2026_04_02.md`
- `uzzapp_deck_export_only_hybrid_pdf_facts_2026_04_02.md`
- `uzzapp_deck_export_only_hybrid_minimal_override_pattern_2026_04_02.md`
- `uzzapp_deck_export_only_hybrid_minimal_override_facts_2026_04_02.md`
- `uzzapp_deck_export_only_hybrid_cta_light_pdf_2026_04_02.md`
- `uzzapp_deck_export_cta_light_facts_2026_04_02.md`

### Editable PPTX and gradients
- `uzzapp_openai_slides_skill_pptx_rebuild_2026_04_05.md`
- `uzzapp_openai_slides_skill_pptx_rebuild.md`
- `uzzapp_openai_slides_skill_pptx_rebuild_facts_2026_04_05.md`
- `uzzapp_native_gradient_pptx_pipeline_2026_04_05.md`
- `uzzapp_native_gradient_pptx_pipeline_facts_2026_04_05.md`
- `uzzapp_native_gradient_html_background_alignment_2026_04_05.md`
- `uzzapp_native_gradient_html_background_alignment_facts_2026_04_05.md`