# Playbook — Screenshots de app para as lojas via **browser headless**

> **Objetivo:** logar no app e capturar screenshots em tamanho de celular
> (prontos para Google Play / App Store) por linha de comando, sem mexer no
> celular nem em emulador.
>
> Portado do playbook do Convoca (2026-06). Funciona em qualquer site
> responsivo — aqui, `https://uzzapp.uzzai.com.br`.

---

## 0. Ideia central

O app UzzApp (Capacitor, remote-URL) carrega o site ao vivo numa WebView.
"Screenshot do app" = screenshot do site em viewport de celular. Usamos o
Chrome já instalado dirigido pelo `puppeteer-core` (não baixa Chromium).

---

## 1. Pré-requisitos

```bash
pnpm add -D puppeteer-core
```

Uma **conta de teste** para logar (não a sua conta real). No UzzApp isso é um
`user_profiles` associado a um `client_id` de teste, com dados populados
(conversas, contatos, agente configurado) — necessário também para os Review
Notes da Apple ("Demo Account").

---

## 2. Regras de tamanho das lojas

| Loja | Regra |
|------|-------|
| **Google Play** | min 320px, max 3840px, maior lado ≤ 2× o menor (ratio ≤ 2:1) |
| **App Store** | tamanhos exatos por device — obrigatório iPhone 6.9" |

### Google Play — viewport recomendado
`412×732 @ dsf3` → `1236×2196` (ratio 1.78 ✅)

### App Store — tamanhos obrigatórios

| Device | Tamanho | Viewport CSS → dsf |
|---|---|---|
| **iPhone 6.9"** ← obrigatório | **1320 × 2868 px** | 440 × 956 @ dsf3 |
| iPad Pro 13" (a rejeição de 2026-03-24 citou revisão em **iPad Air**) | **2048 × 2732 px** | 1024 × 1366 @ dsf2 |

> ⚠️ Não misturar screenshots de Play e App Store — ratios diferentes.
> Para o UzzApp, gerar **também** screenshots de iPad — a última rejeição
> testou explicitamente em iPad Air 11-inch.

---

## 3. Script de captura

`screenshots.mjs` (adaptar `BASE`, seletores de login e lista de páginas):

```js
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const mode = process.argv.includes("--appstore") ? "appstore"
  : process.argv.includes("--ipad") ? "ipad" : "play";

const OUT = `C:/Users/pedro/uzzapp-screenshots/${mode}`;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "https://uzzapp.uzzai.com.br";

const VIEWPORTS = {
  play:     { w: 412, h: 732, dsf: 3 },   // 1236x2196, ratio 1.78 (Play)
  appstore: { w: 440, h: 956, dsf: 3 },   // 1320x2868, ratio 2.17 (Apple iPhone)
  ipad:     { w: 1024, h: 1366, dsf: 2 }, // 2048x2732 (Apple iPad)
};
const { w: VW, h: VH, dsf: DSF } = VIEWPORTS[mode];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF, isMobile: mode !== "ipad", hasTouch: true });

const settle = (ms = 1500) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log("shot:", n); };

// 1) login
await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
await settle(1500);
await shot("01-login");

// 2) logar (ajustar seletores conforme src/app/(auth)/login/page.tsx)
await page.type('input[type="email"]', "demo@uzzai.com.br", { delay: 20 });
await page.type('input[type="password"]', "TROCAR_SENHA_DEMO", { delay: 20 });
await Promise.all([
  page.click('button[type="submit"]'),
  page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
]);
await settle(3000);
console.log("URL pós-login:", page.url());

// 3) percorrer páginas autenticadas
const PAGES = ["/dashboard", "/dashboard/conversations", "/dashboard/contacts", "/dashboard/agents"];
let i = 2;
for (const path of PAGES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
  await settle(2500);
  await shot(String(i++).padStart(2, "0"));
}
await browser.close();
console.log("DONE ->", OUT);
```

Rodar:
```bash
node screenshots.mjs --play       # Google Play
node screenshots.mjs --appstore   # App Store iPhone 6.9"
node screenshots.mjs --ipad       # App Store iPad 13" (obrigatório — última rejeição testou em iPad)
```

---

## 4. Validar as dimensões

```bash
node -e "const fs=require('fs');const d='C:/Users/pedro/uzzapp-screenshots/appstore';
for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.png'))){
  const b=fs.readFileSync(d+'/'+f);const w=b.readUInt32BE(16),h=b.readUInt32BE(20);
  console.log(f,w+'x'+h,'ratio',(h/w).toFixed(2));}"
```

---

## 5. Contact sheet para curar

Ver o script `contact.mjs` no playbook original do Convoca
(`C:\Projetos Uzz.Ai\Convoca\Convoca\docs\playbooks\app-screenshots-headless\README.md`
§5) — monta um grid de miniaturas numeradas para escolher as melhores 4-8 sem
abrir cada PNG individualmente.

---

## 6. Gotchas

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Play rejeita screenshot | ratio > 2:1 | usar 9:16 (412×732 @ dsf3) |
| Site renderiza layout desktop | largura CSS grande | largura ≈412-440 + deviceScaleFactor 2-3 |
| Página "pública" cai no login | rota protegida sem exceção | capturar logado (cookie de sessão) |
| Login não acontece | seletor errado | ajustar `input[type=email/password]`, logar `page.url()` |
| Telas cortadas | animação/lazy load | aumentar `settle()` antes do shot |
| Falta screenshot de iPad | app roda em iPad por padrão no Capacitor | gerar com `--ipad`, obrigatório pela última rejeição |
