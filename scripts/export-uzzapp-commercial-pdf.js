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
    "C:\\Users\\Luisf\\.cache\\puppeteer\\chrome\\win64-146.0.7680.31\\chrome-win64\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const inputPath = path.resolve(
    rootDir,
    getArg("--input") || "docs/UzzApp_Apresentacao_Comercial_v2.html",
  );
  const outputPath = path.resolve(
    rootDir,
    getArg("--output") || "docs/UzzApp_Apresentacao_Comercial_v2.pdf",
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

    await page.evaluate(() => {
      document.body.classList.add("export-pdf");
    });

    await page.emulateMediaType("print");
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 1500));

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
    console.log(`SizeMB: ${sizeMb}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
