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
    getArg("--output") || "UzzApp_Apresentacao_Comercial_v2.pdf",
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
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

    const fileUrl = `file:///${inputPath.replace(/\\/g, "/")}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60000 });

    await page.emulateMediaType("screen");
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
          break-after: page !important;
          page-break-after: always !important;
        }

        .slide:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }

        .slide,
        .slide::before,
        .gradient-text,
        .device,
        .device-screen,
        .device-notch,
        .device-bar,
        [style*="backdrop-filter"],
        [style*="-webkit-backdrop-filter"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          forced-color-adjust: none !important;
        }
      `,
    });

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
    console.log("RenderMode: live-html");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
