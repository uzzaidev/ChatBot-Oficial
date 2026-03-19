#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;

const rootDir = path.resolve(__dirname, "..");
const tmpDir = path.join(rootDir, "tmp", "pdfs");
const outputDir = path.join(rootDir, "output", "pdf");
const htmlPath = path.join(tmpDir, "uzzapp-app-summary.html");
const previewPath = path.join(tmpDir, "uzzapp-app-summary-preview.png");
const pdfPath = path.join(outputDir, "uzzapp-app-summary.pdf");

function findBrowserExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Users\\Luisf\\.cache\\puppeteer\\chrome\\win64-146.0.7680.31\\chrome-win64\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const html = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>UzzApp - Repo Summary</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }

      :root {
        --bg: #f4f3ef;
        --paper: #fffdf9;
        --ink: #1c2328;
        --muted: #5d676f;
        --line: #d8d2c7;
        --accent: #1a7f64;
        --accent-soft: #e8f4f0;
        --accent-dark: #0f5b47;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }

      body {
        width: 210mm;
      }

      .page {
        width: 210mm;
        height: 297mm;
        padding: 12mm;
        background:
          radial-gradient(circle at top right, rgba(26, 127, 100, 0.11), transparent 28%),
          linear-gradient(180deg, #fffdf9 0%, #fffaf4 100%);
        overflow: hidden;
      }

      .frame {
        height: 100%;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 253, 249, 0.92);
        padding: 12mm 11mm 9mm;
        display: flex;
        flex-direction: column;
        gap: 7mm;
      }

      .eyebrow {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: var(--accent-dark);
        background: var(--accent-soft);
        border: 1px solid rgba(26, 127, 100, 0.18);
        border-radius: 999px;
        padding: 5px 10px;
      }

      .header {
        display: grid;
        grid-template-columns: 1.25fr 0.9fr;
        gap: 8mm;
        align-items: start;
      }

      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.05;
        letter-spacing: -0.6px;
      }

      .subtitle {
        margin: 7px 0 0;
        font-size: 12.5px;
        line-height: 1.45;
        color: var(--muted);
      }

      .persona {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px 14px;
        background: rgba(232, 244, 240, 0.55);
      }

      .persona h2 {
        margin: 0 0 7px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--accent-dark);
      }

      .persona p {
        margin: 0;
        font-size: 12px;
        line-height: 1.45;
      }

      .grid {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 7mm;
        min-height: 0;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 13px 14px 12px;
        background: rgba(255, 255, 255, 0.74);
      }

      .card h2 {
        margin: 0 0 10px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--accent-dark);
      }

      ul {
        margin: 0;
        padding-left: 16px;
      }

      li {
        margin: 0 0 7px;
        font-size: 11.2px;
        line-height: 1.34;
      }

      li:last-child {
        margin-bottom: 0;
      }

      .stack {
        display: flex;
        flex-direction: column;
        gap: 7mm;
      }

      .flow {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 2px;
      }

      .step {
        font-size: 10.1px;
        line-height: 1.25;
        color: var(--ink);
        padding: 6px 8px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: #faf6ef;
      }

      .arrow {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--muted);
        font-size: 11px;
        padding: 0 2px;
      }

      .run-list li {
        margin-bottom: 8px;
      }

      code {
        font-family: Consolas, "Courier New", monospace;
        font-size: 10.2px;
        background: #f2eee7;
        padding: 1px 5px;
        border-radius: 5px;
      }

      .footer {
        margin-top: auto;
        padding-top: 6px;
        border-top: 1px solid var(--line);
        font-size: 9.2px;
        line-height: 1.35;
        color: var(--muted);
      }

      .label {
        color: var(--ink);
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="frame">
        <div class="eyebrow">Repo-based one-page summary</div>

        <section class="header">
          <div>
            <h1>UzzApp</h1>
            <p class="subtitle">
              UzzApp is a multi-tenant Next.js application for managing WhatsApp conversations with AI,
              operations tooling, and customer data from one dashboard. In this repo, the same codebase also
              includes CRM, knowledge/RAG, analytics, billing, calendar integrations, and mobile shells.
            </p>
          </div>

          <aside class="persona">
            <h2>Who it is for</h2>
            <p>
              Primary persona: administrators and operators who manage a team or client WhatsApp channel and
              need real-time oversight, automation, and tenant-scoped access control.
            </p>
          </aside>
        </section>

        <section class="grid">
          <div class="card">
            <h2>What it does</h2>
            <ul>
              <li>Shows conversation activity, metrics, and dashboard views for day-to-day operations.</li>
              <li>Processes inbound WhatsApp webhooks per client for text, audio, image, document, and interactive messages.</li>
              <li>Lets each tenant create, activate, schedule, and experiment with AI agents and flows.</li>
              <li>Runs CRM pipelines with Kanban cards, tags, automation rules, analytics, and lead-source capture.</li>
              <li>Uploads documents and images, extracts text, chunks content, and stores embeddings for RAG context.</li>
              <li>Supports outbound commands, templates, scheduled messaging, and human handoff paths.</li>
              <li>Includes calendar integrations, Stripe payments/storefront, and Capacitor mobile wrappers.</li>
            </ul>
          </div>

          <div class="stack">
            <section class="card">
              <h2>How it works</h2>
              <ul>
                <li><span class="label">UI layer:</span> Next.js App Router pages handle landing, auth, dashboard modules, and storefront pages.</li>
                <li><span class="label">API layer:</span> <code>/api/*</code> routes cover webhooks, auth, agents, CRM, analytics, documents, templates, billing, and integrations.</li>
                <li><span class="label">Core flow:</span> <code>processChatbotMessage</code> orchestrates parse, customer lookup, media normalization/transcription, Redis batching/dedup, history + RAG, AI response, formatting, send, and CRM/status updates.</li>
                <li><span class="label">State/services:</span> Supabase (Auth, Postgres, Storage, Vault, migrations), Redis, OpenAI/Groq, Meta WhatsApp API, Google/Microsoft calendars, Stripe.</li>
              </ul>
              <div class="flow" aria-label="Data flow">
                <span class="step">Meta webhook</span>
                <span class="arrow">-&gt;</span>
                <span class="step">client config from Vault</span>
                <span class="arrow">-&gt;</span>
                <span class="step">chatbotFlow + nodes</span>
                <span class="arrow">-&gt;</span>
                <span class="step">Supabase/Redis/AI services</span>
                <span class="arrow">-&gt;</span>
                <span class="step">WhatsApp response + dashboard data</span>
              </div>
            </section>

            <section class="card">
              <h2>How to run</h2>
              <ul class="run-list">
                <li>Install Node 18+ and project dependencies: <code>npm install</code></li>
                <li>Create <code>.env.local</code> with required project settings. Example env file: <strong>Not found in repo.</strong></li>
                <li>Apply the database setup: <code>supabase db push</code></li>
                <li>Start the dev server: <code>npm run dev</code> and open <code>http://localhost:3000</code></li>
              </ul>
            </section>
          </div>
        </section>

        <footer class="footer">
          Based on repo evidence including <code>README.md</code>, App Router pages, webhook routes,
          <code>src/flows/chatbotFlow.ts</code>, <code>src/lib/config.ts</code>, <code>src/lib/vault.ts</code>,
          and Supabase migrations.
        </footer>
      </section>
    </main>
  </body>
</html>`;

async function ensureDirs() {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  await ensureDirs();
  fs.writeFileSync(htmlPath, html, "utf8");

  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error("No compatible Chrome/Edge executable was found for Puppeteer.");
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    const layout = await page.evaluate(() => {
      const pageEl = document.querySelector(".page");
      const frameEl = document.querySelector(".frame");
      if (!pageEl || !frameEl) {
        return { ok: false, reason: "Missing layout root" };
      }

      const pageRect = pageEl.getBoundingClientRect();
      const frameRect = frameEl.getBoundingClientRect();
      const root = document.documentElement;

      const overflowY = Math.max(
        root.scrollHeight - root.clientHeight,
        frameEl.scrollHeight - frameEl.clientHeight,
      );

      return {
        ok: overflowY <= 2 && frameRect.bottom <= pageRect.bottom + 1,
        overflowY,
        pageHeight: pageRect.height,
        frameBottom: frameRect.bottom,
        pageBottom: pageRect.bottom,
      };
    });

    if (!layout.ok) {
      throw new Error(`Layout overflow detected: ${JSON.stringify(layout)}`);
    }

    await page.screenshot({
      path: previewPath,
      fullPage: false,
      type: "png",
    });

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);

    if (pdfData.numpages !== 1) {
      throw new Error(`Expected exactly 1 PDF page, got ${pdfData.numpages}`);
    }

    const stats = fs.statSync(pdfPath);
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log(`HTML: ${htmlPath}`);
    console.log(`Preview: ${previewPath}`);
    console.log(`PDF: ${pdfPath}`);
    console.log(`Pages: ${pdfData.numpages}`);
    console.log(`SizeKB: ${sizeKb}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
