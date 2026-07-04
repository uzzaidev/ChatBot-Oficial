#!/usr/bin/env node
/**
 * Configura os 6 secrets do CI iOS (GitHub Actions) via `gh` CLI.
 *
 * Portado do playbook do Convoca (docs/playbooks/github-secrets-via-cli/README.md).
 * Pede os valores interativamente, faz base64 quando necessário, e chama
 * `gh secret set` para cada um. Repo alvo: uzzaidev/ChatBot-Oficial.
 *
 * Uso:
 *   node scripts/setup-ios-ci-secrets.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const REPO = "uzzaidev/ChatBot-Oficial";

const rl = readline.createInterface({ input: stdin, output: stdout });

const ask = async (question) => (await rl.question(question)).trim();

const setSecret = (name, value) => {
  execFileSync("gh", ["secret", "set", name, "--repo", REPO, "--body", value], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  console.log(`✅ ${name} → set`);
};

const main = async () => {
  console.log(`Configurando secrets do CI iOS em ${REPO}\n`);

  const p8Path = await ask(
    "Caminho do arquivo .p8 da App Store Connect (Admin key): ",
  );
  if (!existsSync(p8Path)) throw new Error(`Arquivo não encontrado: ${p8Path}`);
  const p8Content = readFileSync(p8Path, "utf8");

  const keyId = await ask("App Store Connect Key ID: ");
  const issuerId = await ask("App Store Connect Issuer ID (UUID): ");

  const plistPath = await ask(
    "Caminho do GoogleService-Info.plist (iOS, baixado do Firebase): ",
  );
  if (!existsSync(plistPath))
    throw new Error(`Arquivo não encontrado: ${plistPath}`);
  const plistBase64 = readFileSync(plistPath).toString("base64");

  const matchPassword = await ask(
    "MATCH_PASSWORD (senha para criptografar os certs no repo uzzapp-certs): ",
  );

  const ghUser = await ask("GitHub username (dono do token, ex: uzzaidev): ");
  const ghToken = await ask(
    "GitHub PAT com acesso de leitura ao repo uzzapp-certs (ghp_...): ",
  );
  const matchGitAuth = Buffer.from(`${ghUser}:${ghToken}`).toString("base64");

  rl.close();

  setSecret("APP_STORE_CONNECT_API_KEY_ID", keyId);
  setSecret("APP_STORE_CONNECT_API_ISSUER_ID", issuerId);
  setSecret("APP_STORE_CONNECT_API_KEY_CONTENT", p8Content);
  setSecret("MATCH_PASSWORD", matchPassword);
  setSecret("MATCH_GIT_BASIC_AUTHORIZATION", matchGitAuth);
  setSecret("GOOGLE_SERVICE_INFO_PLIST_BASE64", plistBase64);

  console.log("\nVerificando no GitHub...");
  execFileSync("gh", ["secret", "list", "--repo", REPO], { stdio: "inherit" });

  console.log("\n✅ Todos os 6 secrets configurados. Pode disparar o workflow ios-release.");
};

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
});
