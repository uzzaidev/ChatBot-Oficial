---
children_hash: da7ac5d6900f5a5c0eb9200b4e72a3ded83d48c3617851d18d7dc417517bbcc0
compression_ratio: 0.7786941580756014
condensation_order: 2
covers: [context.md, project/_index.md]
covers_token_total: 1455
summary_level: d2
token_count: 1133
type: summary
---
# Domain: facts / Topic: project

## Structural overview
This topic stores durable repository-level facts for ChatBot-Oficial, combining:
1. **ByteRover execution requirements for this repository**
2. **A dated application/project snapshot**
3. **A specific commercial deck export implementation fact set**

The entries are complementary: workflow constraints define how repository work must be done, while dated fact entries capture what was true in the repo on **2026-03-31**.

## Main clusters

### 1) Repository workflow baseline
From **`initial_byterover_repository_sanity_check.md`** and **`byterover_cwd_requirement_for_repository.md`**:

- Repository work is expected to begin with a **project-scoped ByteRover query** and end with **knowledge curation after significant completion**.
- On **2026-03-31**, the initial project-scoped query found **no prior curated knowledge** for this cwd.
- All ByteRover MCP operations for this repo must use:
  - `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- Reason:
  - ByteRover MCP is running in **global mode**, so the repository cwd must be passed explicitly.
- Operational pattern:
  - need ByteRover action → include explicit repo cwd → execute

### 2) Project/application state snapshot
From **`chatbot_oficial_state_facts_2026_03_31.md`**:

- ChatBot-Oficial is described as a **multi-tenant SaaS for WhatsApp customer service with AI**.
- Main frontend/app stack:
  - **Next.js 16**
  - **React 18**
- Key ecosystem dependencies called out:
  - **Supabase**
  - **Stripe**
  - **Redis**
  - **AI SDK / OpenAI / Groq**
  - **Capacitor**
  - **Jest**
- Validation status on the snapshot date:
  - **3 test suites / 10 tests passed**
  - **lint: 12 warnings, 0 errors**
  - production build was **not fully revalidated outside sandbox**
  - **EPERM spawn** issue was treated as an **environment limitation**, not confirmed app failure
- Documentation/code drift:
  - **`README.md`** says **Next.js 14**
  - **`package.json`** reflects **Next.js 16**
- Recent product focus areas included Meta/WhatsApp work:
  - coexistence sync
  - unified multi-tenant webhook
  - SMB echoes
  - Embedded Signup
  - dashboard/settings improvements
  - improved logging and error handling

### 3) Commercial deck export implementation facts
From **`commercial_deck_export_facts_2026_03_31.md`**:

- Primary artifact set:
  - `docs/UzzApp_Apresentacao_Comercial_v2.html`
  - `scripts/export-uzzapp-commercial-pdf.js`
  - `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
- Architectural/export decision:
  - preserve fixed slide layout for both mobile viewing and PDF generation rather than reflow slide internals
- Key layout/export pattern:
  - slides remain fixed at **1280x720**
  - controlled via:
    - `--slide-width`
    - `--slide-height`
    - `--deck-scale`
  - narrow screens use `transform: scale(var(--deck-scale))` plus negative margin compensation
  - `@media print` reasserts page/layout sizing and page-break behavior
  - `body.export-pdf` disables heavy visual effects for deterministic PDF output
- Export script behavior:
  - implemented in **Puppeteer**
  - viewport set to **1280x720**
  - calls `emulateMediaType("print")`
  - waits for `document.fonts.ready`
  - adds `body.export-pdf`
  - exports with `page.pdf({ preferCSSPageSize: true })`
- Result:
  - output PDF: `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - final length: **12 pages**
- Asset-path correction captured:
  - `docs/Prints google`
  - `docs/ios/screenshots/auth-ipad-13in`

## Relationships and usage pattern
- **`initial_byterover_repository_sanity_check.md`** defines the repository’s first-run and workflow expectation.
- **`byterover_cwd_requirement_for_repository.md`** adds the environment-specific requirement that makes those operations work correctly.
- **`chatbot_oficial_state_facts_2026_03_31.md`** is the broad dated product/repo snapshot.
- **`commercial_deck_export_facts_2026_03_31.md`** is a focused artifact-level fact record that fits under project facts because it captures stable file paths, export mechanics, and output characteristics.

## Drill-down map
- Workflow initialization and “no prior knowledge” state: **`initial_byterover_repository_sanity_check.md`**
- Mandatory ByteRover cwd rule: **`byterover_cwd_requirement_for_repository.md`**
- Product stack, validation state, and README/package drift: **`chatbot_oficial_state_facts_2026_03_31.md`**
- PDF/mobile deck structure, Puppeteer export flow, and output facts: **`commercial_deck_export_facts_2026_03_31.md`**