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

function buildPdfHtml(imageBuffers) {
  const pages = imageBuffers
    .map((buffer, index) => {
      const src = `data:image/png;base64,${buffer.toString("base64")}`;
      return `<section class="page"><img src="${src}" alt="Slide ${index + 1}" /></section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>UzzApp Image PDF</title>
  <style>
    @page { size: 1280px 720px; margin: 0; }
    html, body { margin: 0; padding: 0; background: #000; }
    .page { width: 1280px; height: 720px; break-after: page; page-break-after: always; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    img { display: block; width: 1280px; height: 720px; }
  </style>
</head>
<body>${pages}</body>
</html>`;
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const deckDir = path.resolve(rootDir, getArg("--dir") || "docs/UzzApp apresentacao Luis");
  const inputPath = path.resolve(deckDir, getArg("--input") || "UzzApp_Apresentacao_Comercial_v2.html");
  const outputPath = path.resolve(
    deckDir,
    getArg("--output") || "UzzApp_Apresentacao_Comercial_v2.image.pdf",
  );
  const slidesDir = path.resolve(deckDir, "output", "image-pdf-slides");

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo HTML nao encontrado: ${inputPath}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(slidesDir, { recursive: true });

  const executablePath = findBrowserExecutable();
  const launchOptions = {
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  };
  if (executablePath) launchOptions.executablePath = executablePath;

  const browser = await puppeteer.launch(launchOptions);

  try {
    const deckPage = await browser.newPage();
    await deckPage.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

    const fileUrl = `file:///${inputPath.replace(/\\/g, "/")}`;
    await deckPage.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60000 });
    await deckPage.evaluateHandle("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const slideCount = await deckPage.evaluate(() => document.querySelectorAll(".slide").length);
    if (!slideCount) throw new Error("Nenhum slide encontrado no HTML.");

    const imageBuffers = [];

    for (let index = 0; index < slideCount; index += 1) {
      await deckPage.evaluate((activeIndex) => {
        const slides = Array.from(document.querySelectorAll(".slide"));
        document.body.classList.add("single-slide");
        slides.forEach((slide, idx) => slide.classList.toggle("active", idx === activeIndex));
      }, index);

      await new Promise((resolve) => setTimeout(resolve, 120));

      const pngBuffer = await deckPage.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 1280, height: 720 },
      });

      imageBuffers.push(pngBuffer);
      fs.writeFileSync(
        path.join(slidesDir, `slide-${String(index + 1).padStart(2, "0")}.png`),
        pngBuffer,
      );
    }

    const pdfPage = await browser.newPage();
    await pdfPage.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await pdfPage.setContent(buildPdfHtml(imageBuffers), { waitUntil: "load" });
    await pdfPage.emulateMediaType("print");

    await pdfPage.pdf({
      path: outputPath,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`PDF: ${outputPath}`);
    console.log(`SlidesDir: ${slidesDir}`);
    console.log(`SlideCount: ${slideCount}`);
    console.log(`SizeMB: ${sizeMb}`);
    console.log("RenderMode: image-pdf");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
