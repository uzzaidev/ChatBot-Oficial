#!/usr/bin/env node
/**
 * Corrige o Podfile do iOS depois de `cap sync ios` / `cap copy ios`.
 *
 * Com pnpm, o Capacitor CLI resolve os pacotes via `require.resolve()` e
 * grava o path real no disco, que inclui o virtual store hasheado do pnpm:
 *   node_modules/.pnpm/@capacitor+camera@7.0.5_@capacitor+core@7.4.4/node_modules/@capacitor/camera
 *
 * Esse hash muda sempre que o lockfile muda (nova dependência, nova versão),
 * então o Podfile gerado localmente quebra no CI assim que o lockfile for
 * diferente (`No podspec found for CapacitorXxx` — mesmo bug documentado no
 * playbook docs/playbooks/ios-ci-sem-mac). A correção: reescrever para o path
 * hoisted estável `../../node_modules/@escopo/pacote`.
 *
 * Rodar sempre depois de `cap sync ios` / `cap copy ios`:
 *   node scripts/fix-ios-podfile-paths.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const podfilePath = join(__dirname, "..", "ios", "App", "Podfile");

const content = readFileSync(podfilePath, "utf8");

// Troca qualquer node_modules/.pnpm/<hash>/node_modules/<pacote> por
// node_modules/<pacote> (path hoisted, estável entre máquinas/CI).
const fixed = content.replace(
  /node_modules\/\.pnpm\/[^/]+\/node_modules\/(@[^/'"]+\/[^/'"]+)/g,
  "node_modules/$1",
);

if (fixed === content) {
  console.log("Podfile já está com paths hoisted — nada a corrigir.");
} else {
  writeFileSync(podfilePath, fixed);
  console.log("Podfile corrigido: paths .pnpm/<hash>/ -> node_modules/<pacote> hoisted.");
}
