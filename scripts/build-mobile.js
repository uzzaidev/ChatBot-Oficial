#!/usr/bin/env node
/**
 * Gera o `out/` de fallback exigido pelo Capacitor (`webDir: 'out'` em
 * capacitor.config.ts), sem tentar exportar o app Next.js inteiro.
 *
 * Por quê: `next build` com `output: 'export'` (CAPACITOR_BUILD=true no
 * next.config.js) exige que NENHUMA rota tenha `export const dynamic =
 * "force-dynamic"` — mas essa é a regra obrigatória de TODAS as rotas de API
 * deste projeto (ver CLAUDE.md). Um export estático completo nunca vai
 * compilar aqui sem reescrever dezenas de rotas de API.
 *
 * Isso não é um problema real: o app carrega via `server.url` (site de
 * produção ao vivo, ver capacitor.config.ts) — o `webDir: 'out'` é só uma
 * exigência técnica do `cap sync`/`cap copy`, nunca usado de fato quando
 * `server.url` está configurado. Este script só garante que a pasta exista
 * com um HTML mínimo válido.
 */

const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const outDir = join(__dirname, "..", "out");

mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, "index.html"),
  `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UzzApp</title>
</head>
<body>
  <p>Carregando UzzApp...</p>
</body>
</html>
`,
);

console.log(`Fallback estático gerado em ${outDir}/index.html`);
