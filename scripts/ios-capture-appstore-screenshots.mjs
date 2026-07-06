/**
 * Captura screenshots App Store (iPhone 6.5" = 1284x2778) via Puppeteer.
 *
 * Uso:
 *   node scripts/ios-capture-appstore-screenshots.mjs
 *   DEMO_EMAIL=contato@uzzai.com.br DEMO_PASSWORD=secret node scripts/...
 *
 * Saída: docs/ios/screenshots/appstore-6.5in/
 */

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/ios/screenshots/appstore-6.5in");

const BASE = process.env.SCREENSHOT_BASE_URL ?? "https://uzzapp.uzzai.com.br";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "contato@uzzai.com.br";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Uzzai2025@";

// iPhone 6.5" App Store slot → 1284 x 2778 px
const VW = 428;
const VH = 926;
const DSF = 3;

mkdirSync(OUT, { recursive: true });

const settle = (ms = 2000) => new Promise((r) => setTimeout(r, ms));

const injectScreenshotPrefs = async (page) => {
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("uzzapp-theme", "dark");

    window.Capacitor = {
      getPlatform: () => "ios",
      isNativePlatform: () => true,
      isPluginAvailable: () => false,
    };
  });
};

const applyDarkMode = async (page) => {
  await page.evaluate(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    localStorage.setItem("uzzapp-theme", "dark");
  });
};

const prepareLoginForAppStoreShot = async (page) => {
  await page.addStyleTag({
    content: `
      a[href="/register"] { display: none !important; }
      form ~ div.mt-6:has(.grid.grid-cols-3) { display: none !important; }
    `,
  });
  await page.evaluate(() => {
    const footer = document.querySelector('a[href="/register"]')?.parentElement;
    if (footer) {
      footer.textContent =
        "Este app é para contas já existentes. Use o link de convite por e-mail.";
    }
  });
};

const openMobileMenu = async (page) => {
  await page.evaluate(() => {
    const menuButton = document.querySelector("button svg.lucide-menu")?.closest("button");
    menuButton?.click();
  });
  await settle(1000);
};

const openConversationsList = async (page) => {
  await page.evaluate(() => {
    const verConversas = [...document.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Ver Conversas"),
    );
    verConversas?.click();
  });
  await settle(1500);
};

const dismissToasts = async (page) => {
  await page.evaluate(() => {
    const selectors = [
      "[data-sonner-toast]",
      "[data-radix-toast-viewport]",
      "[role='status']",
      "ol[tabindex='-1']",
    ];
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    }
  });
};

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--disable-gpu"],
});

const context = browser.defaultBrowserContext();
await context.overridePermissions(new URL(BASE).origin, ["notifications"]);

const page = await browser.newPage();
await page.setViewport({
  width: VW,
  height: VH,
  deviceScaleFactor: DSF,
  isMobile: true,
  hasTouch: true,
});

const shot = async (filename) => {
  await dismissToasts(page);
  await applyDarkMode(page);
  const filePath = path.join(OUT, filename);
  await page.screenshot({ path: filePath, type: "png" });
  console.log("✓", filePath);
};

try {
  await injectScreenshotPrefs(page);

  // 1) Login — captura antes do toast de notificações (dispara após ~2s)
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 90000 });
  await applyDarkMode(page);
  await prepareLoginForAppStoreShot(page);
  await settle(1200);
  await shot("01-login.png");

  await page.type('input[type="email"]', DEMO_EMAIL, { delay: 15 });
  await page.type('input[type="password"]', DEMO_PASSWORD, { delay: 15 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page
      .waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 })
      .catch(() => {}),
  ]);
  await settle(4000);
  await dismissToasts(page);
  console.log("URL pós-login:", page.url());

  const authPages = [
    ["/dashboard", "02-dashboard.png"],
    ["/dashboard/conversations", "03-conversas.png"],
    ["/dashboard/contacts", "04-contatos.png"],
    ["/dashboard/knowledge", "05-conhecimento.png"],
  ];

  for (const [route, filename] of authPages) {
    await page.goto(`${BASE}${route}`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await applyDarkMode(page);
    if (route === "/dashboard") {
      await openMobileMenu(page);
    }
    if (route === "/dashboard/conversations") {
      await openConversationsList(page);
    }
    if (route === "/dashboard/contacts") {
      await openMobileMenu(page);
    }
    await settle(3500);
    await shot(filename);
  }

  const publicPages = [
    ["/privacy", "06-privacy.png"],
    ["/terms", "07-terms.png"],
    ["/support", "08-support.png"],
  ];

  for (const [route, filename] of publicPages) {
    await page.goto(`${BASE}${route}`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await applyDarkMode(page);
    await settle(2000);
    await shot(filename);
  }

  console.log("\nDONE →", OUT);
} catch (error) {
  console.error("Falha na captura:", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
