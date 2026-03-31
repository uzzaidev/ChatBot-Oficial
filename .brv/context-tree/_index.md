---
children_hash: 43dec348917accdd6e34359f28b1c2ec67ad493f079ff8c1637af32ac1301bac
compression_ratio: 0.6510331256149557
condensation_order: 3
covers: [architecture/_index.md, facts/_index.md]
covers_token_total: 3049
summary_level: d3
token_count: 1985
type: summary
---
# Structural Summary

## Knowledge map
This level combines two domains that describe the same repository from different angles:

- **`architecture/_index.md`**: system design, runtime decisions, and dated architecture state
- **`facts/_index.md`**: durable repository facts, operational constraints, and artifact-level implementation facts

Together they describe **ChatBot-Oficial** as a **multi-tenant WhatsApp customer-service SaaS with AI**, with a strong emphasis on:
- deterministic production runtime behavior
- explicit repository/workflow constraints
- date-stamped state capture on **2026-03-31**
- reusable fixed-layout HTML-to-PDF export patterns

---

## 1) Core platform architecture
Primary source: **`architecture/_index.md`**

### Runtime shape
The dominant architectural pattern is:

- `incoming webhook -> flow routing -> serverless node pipeline -> callDirectAI() -> explicit tool processing/handoff -> response`

Key preserved decisions:
- customer-facing realtime execution is centered on **`callDirectAI()`**
- the platform uses a **13-node internal serverless pipeline**
- production WhatsApp flows are designed to be:
  - predictable
  - latency-bounded
  - fail-safe

### Why `callDirectAI()` is central
From **`ai_runtime/_index.md`** and **`agent_framework_decision_for_realtime_flow.md`** drill-downs referenced by `architecture/_index.md`:

`callDirectAI()` is the normalized runtime layer for:
- provider access
- Vault-based per-client credential resolution
- budget enforcement
- usage tracking
- tool-call normalization
- tenant/runtime overrides via **`getClientConfig()`**

Supported hot-path overrides include:
- `prompt`
- `provider`
- `model`
- `enableTools`
- `enableRAG`
- `enableHumanHandoff`

### Framework boundary decision
A durable separation is explicitly preserved:

- **Realtime customer-facing path** → `callDirectAI()`
- **Heavier agent frameworks / Deep Agents** → only for:
  - asynchronous modules
  - internal automations
  - backoffice copilots

Related decision anchors preserved in `architecture/_index.md`:
- **ADR-006** supports reuse of `callDirectAI()`
- **LangChain** is optional and non-primary for the hot path
- hot-path tools are explicit and bounded, including:
  - `transferir_atendimento`
  - `buscar_documento`

---

## 2) Repository and operational state
Primary sources:
- **`architecture/_index.md`**
- **`facts/_index.md`**

### Dated repository truth
Both summaries converge on the same dated snapshot:

- as of **2026-03-31**, ChatBot-Oficial is a production-active **multi-tenant SaaS for WhatsApp customer service with AI**

Preserved stack signals:
- **Next.js 16**
- **React 18**
- **Supabase**
- **Stripe**
- **Redis**
- **AI SDK / OpenAI / Groq**
- **Capacitor**
- **Jest**

### Recent implementation emphasis
Current work was concentrated around Meta/WhatsApp integration:
- contact/history sync or coexistence sync
- unified multi-tenant webhook
- SMB echoes
- Embedded Signup onboarding
- dashboard/settings work
- stronger logging and error handling

### Validation and drift
Preserved repository-state facts from **`chatbot_oficial_snapshot_2026_03_31.md`** and **`chatbot_oficial_state_facts_2026_03_31.md`**:
- tests: **3 suites / 10 tests**
- lint: **0 errors, 12 warnings**
- production build was not fully revalidated outside sandbox
- **EPERM spawn** was treated as an environment/sandbox limitation rather than confirmed application failure

Documentation drift is explicitly tracked:
- **`README.md`** states **Next.js 14**
- **`package.json`** reflects **Next.js 16**

---

## 3) ByteRover repository workflow constraints
Primary source: **`facts/_index.md`**  
Also echoed in architecture via **`byterover_global_mode_cwd_requirement.md`**

### Mandatory cwd rule
A repository-specific operational fact is preserved across both domains:

All ByteRover MCP operations for this repo must pass:
- `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`

Reason:
- ByteRover MCP runs in **global mode**
- explicit repository cwd is therefore required for query/retrieve and curate/store operations

### Workflow baseline
From **`initial_byterover_repository_sanity_check.md`** and related entries:
- repository work should start with a **project-scoped ByteRover query**
- significant work should end with **knowledge curation**
- on **2026-03-31**, the initial project-scoped query found **no prior curated knowledge** for this cwd

Documentation enforcement mentioned in the architecture summary:
- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`

This creates a practical pattern:
- need ByteRover action → include explicit repo cwd → execute

---

## 4) Commercial deck export architecture
Primary sources:
- **`commercial_deck_mobile_pdf_export_pattern.md`**
- **`commercial_deck_export_facts_2026_03_31.md`**

### Artifact set
The export pattern centers on:
- `docs/UzzApp_Apresentacao_Comercial_v2.html`
- `scripts/export-uzzapp-commercial-pdf.js`
- `docs/UzzApp_Apresentacao_Comercial_v2.pdf`

### Design decision
A stable architectural choice is preserved:

- keep slides fixed at **1280x720**
- do **not** reflow absolute-positioned slide internals for mobile
- achieve responsiveness by scaling the whole deck/slide instead

Core layout variables and mechanism:
- `--slide-width`
- `--slide-height`
- `--deck-scale`
- `transform: scale(var(--deck-scale))`
- negative margin compensation to preserve the original coordinate system

### Print/PDF stabilization pattern
For reliable export, print mode explicitly overrides:
- width
- height
- min-height
- max-height
- overflow
- position
- `transform: none`
- page-break behavior

Export-safe mode uses:
- `body.export-pdf`

This disables PDF-hostile visual effects such as:
- glow pseudo-elements
- gradient text clipping
- backdrop blur
- device shadows/notches

### Puppeteer export flow
Preserved implementation details:
- viewport: **1280x720**
- `emulateMediaType("print")`
- wait for `document.fonts.ready`
- export with `page.pdf({ preferCSSPageSize: true })`

Stable output facts:
- deterministic **12-page PDF**
- asset-path corrections under:
  - `docs/Prints google`
  - `docs/ios/screenshots/auth-ipad-13in`

---

## 5) Cross-entry patterns and relationships

### Recurrent architectural stance
Across **`architecture/_index.md`** and **`facts/_index.md`**, the same repository patterns recur:

- **Deterministic core runtime over generalized agent orchestration**
- **Strict hot-path boundaries** for latency-sensitive WhatsApp flows
- **Date-stamped repository truth** to capture drift and validation state
- **Environment-specific execution rules** treated as first-class operational knowledge
- **Fixed-layout scaling + explicit print overrides** as the preferred HTML-to-PDF export pattern

### Drill-down map
Use these child entries for details:

- Runtime model and hot-path boundaries:
  - **`architecture/_index.md`**
  - **`ai_runtime/_index.md`**
  - **`agent_framework_decision_for_realtime_flow.md`**
- Repository state and dated platform snapshot:
  - **`project_state/_index.md`**
  - **`chatbot_oficial_snapshot_2026_03_31.md`**
  - **`chatbot_oficial_state_facts_2026_03_31.md`**
- ByteRover execution constraints:
  - **`byterover_global_mode_cwd_requirement.md`**
  - **`byterover_cwd_requirement_for_repository.md`**
  - **`initial_byterover_repository_sanity_check.md`**
- Commercial deck export design and facts:
  - **`commercial_deck_mobile_pdf_export_pattern.md`**
  - **`commercial_deck_export_facts_2026_03_31.md`**

## Bottom line
At this level, the curated knowledge describes a repository whose defining characteristics are:
- a **bounded realtime AI architecture** built around **`callDirectAI()`**
- a **dated, evidence-based project snapshot** for **2026-03-31**
- a **mandatory ByteRover cwd execution rule** for repository operations
- a **reusable fixed-slide HTML/PDF export pattern** for commercial presentation artifacts