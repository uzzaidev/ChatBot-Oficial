#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function getArg(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : null;
}

function findBrowserExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Users\\Luisf\\.cache\\puppeteer\\chrome\\win64-146.0.7680.31\\chrome-win64\\chrome.exe",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function applyExportOnlyHybridTransforms(page) {
  await page.addStyleTag({
    content: `
      @page {
        size: 1280px 720px;
        margin: 0;
      }

      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #060a0e !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        forced-color-adjust: none !important;
      }

      body {
        width: 1280px !important;
      }

      .deck-shell {
        padding: 0 !important;
      }

      .deck {
        gap: 0 !important;
        max-width: 1280px !important;
      }

      .slide {
        width: 1280px !important;
        height: 720px !important;
        min-height: 720px !important;
        max-height: 720px !important;
        margin: 0 !important;
        overflow: hidden !important;
        position: relative !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        break-after: page !important;
        page-break-after: always !important;
      }

      .slide:last-child {
        break-after: auto !important;
        page-break-after: auto !important;
      }

      .bubble-ai,
      .bubble-ai[style*="linear-gradient"],
      [style*="background: linear-gradient(135deg, #0d2d1f, #0a2040)"] {
        background-color: #102a22 !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230d2d1f'/%3E%3Cstop offset='100%25' stop-color='%230a2040'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='360' height='120' rx='12' fill='url(%23g)'/%3E%3C/svg%3E") !important;
        background-size: 100% 100% !important;
        border: 1px solid rgba(0, 232, 143, 0.18) !important;
        box-shadow: none !important;
      }

      .cta-btn {
        background: #1fe1a4 !important;
        color: #02140f !important;
        box-shadow: none !important;
      }

      .device {
        background: #05080c !important;
        padding: 9px !important;
        box-shadow: none !important;
        border: 1.5px solid rgba(255, 255, 255, 0.16) !important;
      }

      .device-screen {
        background-color: #071019 !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 860'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2309131c'/%3E%3Cstop offset='100%25' stop-color='%23060d14'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='860' fill='url(%23g)'/%3E%3C/svg%3E") !important;
        background-size: 100% 100% !important;
      }

      .device-notch,
      .device-bar {
        display: none !important;
      }

      .browser-frame {
        background-color: #1a1a1a !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 920 560'%3E%3Crect width='920' height='560' rx='12' fill='%2313161a' stroke='rgba(255,255,255,0.06)'/%3E%3C/svg%3E") !important;
        background-size: 100% 100% !important;
        box-shadow: none !important;
      }

      [style*="backdrop-filter"],
      [style*="-webkit-backdrop-filter"] {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        background-color: #1d252e !important;
        box-shadow: none !important;
      }

      .slide,
      .slide::before,
      .gradient-text,
      .gradient-text svg,
      .device,
      .device-screen,
      .browser-frame,
      .bubble-ai {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        forced-color-adjust: none !important;
      }
    `,
  });

  await page.evaluate(() => {
    const svgNs = "http://www.w3.org/2000/svg";

    function upgradeGradientText() {
      const measureCanvas =
        upgradeGradientText.measureCanvas ||
        (upgradeGradientText.measureCanvas = document.createElement("canvas"));
      const ctx = measureCanvas.getContext("2d");
      if (!ctx) return;

      const candidates = document.querySelectorAll(
        ".gradient-text, [style*='-webkit-background-clip: text'], [style*='background-clip: text']",
      );

      candidates.forEach((node, index) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.dataset.gradientSvgBuilt === "1") return;

        const text = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) return;

        const style = window.getComputedStyle(node);
        const fontSize = parseFloat(style.fontSize) || 16;
        const fontWeight = style.fontWeight || "700";
        const fontFamily = style.fontFamily || "Inter, sans-serif";
        const fontStyle = style.fontStyle || "normal";
        const letterSpacing =
          style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing) || 0;
        const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.15;

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        const measuredWidth =
          ctx.measureText(text).width + Math.max(0, (text.length - 1) * letterSpacing);
        const width = Math.ceil(measuredWidth + fontSize * 0.18 + 8);
        const height = Math.ceil(lineHeight + 4);
        const baseline = Math.round(height - Math.max(2, fontSize * 0.18));
        const gradientId = `export-grad-${index}-${text.length}`;

        const svg = document.createElementNS(svgNs, "svg");
        svg.setAttribute("xmlns", svgNs);
        svg.setAttribute("width", String(width));
        svg.setAttribute("height", String(height));
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("aria-hidden", "true");

        const defs = document.createElementNS(svgNs, "defs");
        const gradient = document.createElementNS(svgNs, "linearGradient");
        gradient.setAttribute("id", gradientId);
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y2", "0%");

        const stopA = document.createElementNS(svgNs, "stop");
        stopA.setAttribute("offset", "0%");
        stopA.setAttribute("stop-color", "#00e88f");

        const stopB = document.createElementNS(svgNs, "stop");
        stopB.setAttribute("offset", "100%");
        stopB.setAttribute("stop-color", "#3ba4f5");

        gradient.appendChild(stopA);
        gradient.appendChild(stopB);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        const textEl = document.createElementNS(svgNs, "text");
        textEl.setAttribute("x", "2");
        textEl.setAttribute("y", String(baseline));
        textEl.setAttribute("fill", `url(#${gradientId})`);
        textEl.setAttribute("font-size", String(fontSize));
        textEl.setAttribute("font-family", fontFamily);
        textEl.setAttribute("font-weight", fontWeight);
        textEl.setAttribute("font-style", fontStyle);
        if (letterSpacing) {
          textEl.setAttribute("letter-spacing", String(letterSpacing));
        }
        textEl.textContent = text;
        svg.appendChild(textEl);

        node.textContent = "";
        node.appendChild(svg);
        node.dataset.gradientSvgBuilt = "1";
        node.style.background = "none";
        node.style.webkitTextFillColor = "inherit";
        node.style.color = "inherit";
        node.setAttribute("aria-label", text);
      });
    }

    upgradeGradientText();
  });
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const deckDir = path.resolve(
    rootDir,
    getArg("--dir") || "docs/UzzApp apresentacao Luis",
  );
  const inputPath = path.resolve(
    deckDir,
    getArg("--input") || "UzzApp_Apresentacao_Comercial_v2.html",
  );
  const outputPath = path.resolve(
    deckDir,
    getArg("--output") || "UzzApp_Apresentacao_Comercial_v2.exportonly-hybrid.live-html.pdf",
  );

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo HTML nao encontrado: ${inputPath}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const executablePath = findBrowserExecutable();
  const launchOptions = {
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

    const fileUrl = `file:///${inputPath.replace(/\\/g, "/")}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60000 });

    await page.emulateMediaType("screen");
    await page.evaluateHandle("document.fonts.ready");
    await applyExportOnlyHybridTransforms(page);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const slideCount = await page.evaluate(() => document.querySelectorAll(".slide").length);
    if (!slideCount) {
      throw new Error("Nenhum slide encontrado no HTML.");
    }

    await page.pdf({
      path: outputPath,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`PDF: ${outputPath}`);
    console.log(`SlideCount: ${slideCount}`);
    console.log(`SizeMB: ${sizeMb}`);
    console.log("RenderMode: exportonly-hybrid-live-html");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
