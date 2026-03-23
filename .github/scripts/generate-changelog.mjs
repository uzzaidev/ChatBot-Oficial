// ============================================================================
// AI Changelog Generator
// ============================================================================
// Script Node.js ESM puro (zero dependências externas).
// Usa fetch nativo do Node 22+ para chamar a GitHub Models API.
//
// Variáveis de ambiente esperadas:
//   GH_MODELS_TOKEN — Token OAuth do gh CLI (configurado via `gh auth token | gh secret set GH_MODELS_TOKEN`)
//   BRANCH_NAME     — nome da branch (injetado pelo workflow)
//
// Arquivos esperados no diretório de trabalho:
//   commits.txt                       — output do git log
//   diff.txt                          — output do git diff
//   .github/changelog-instructions.md — system prompt
// ============================================================================

import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const MODELS_ENDPOINT = "https://models.github.ai/inference/chat/completions";
const MODEL_PRIMARY = "openai/gpt-4.1-mini";
const MODEL_FALLBACK = "openai/gpt-4o-mini";
const MAX_DIFF_CHARS = 120_000;

function smartTruncateDiff(rawDiff) {
  if (rawDiff.length <= MAX_DIFF_CHARS) return rawDiff;

  // Extrair diffstat (resumo de arquivos alterados) via git
  let diffstat = "";
  try {
    diffstat = execSync("git diff --stat HEAD~1 HEAD", { encoding: "utf8" });
  } catch {
    // fallback: extrair headers do diff
    diffstat = rawDiff
      .split("\n")
      .filter(
        (l) =>
          l.startsWith("diff --git") ||
          l.startsWith("+++") ||
          l.startsWith("---"),
      )
      .join("\n");
  }

  // Pegar os primeiros MAX_DIFF_CHARS do diff real para contexto
  const truncatedDiff = rawDiff.slice(0, MAX_DIFF_CHARS);

  return [
    "=== Resumo de arquivos alterados ===",
    diffstat,
    "",
    "=== Diff parcial (truncado) ===",
    truncatedDiff,
    "",
    `[... diff truncado: ${(rawDiff.length / 1000).toFixed(
      0,
    )}k chars total, mostrando ${(MAX_DIFF_CHARS / 1000).toFixed(0)}k ...]`,
  ].join("\n");
}

async function callModel(token, model, messages) {
  console.log(`Chamando GitHub Models API (${model})...`);
  const response = await fetch(MODELS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });
  return response;
}

async function main() {
  const token = process.env.GH_MODELS_TOKEN;
  if (!token) {
    console.error(
      "GH_MODELS_TOKEN não configurado. Pulando geração de changelog.",
    );
    process.exit(0);
  }

  // --- Ler arquivos de contexto ---
  const commits = await readFile("commits.txt", "utf8").catch(() => "");
  const rawDiff = await readFile("diff.txt", "utf8").catch(() => "");

  if (!commits.trim() && !rawDiff.trim()) {
    console.log("Nenhum commit ou diff encontrado. Pulando.");
    process.exit(0);
  }

  const instructions = await readFile(
    ".github/changelog-instructions.md",
    "utf8",
  );

  const diff = smartTruncateDiff(rawDiff);

  const today = new Date().toISOString().split("T")[0];
  const branch = process.env.BRANCH_NAME || "main";

  // --- Chamar GitHub Models API ---
  const userPrompt = [
    `Data: ${today}`,
    `Branch: ${branch}`,
    "",
    "Commits:",
    commits,
    "",
    "Diff:",
    diff,
  ].join("\n");

  console.log(
    `Tamanho do prompt: ~${(userPrompt.length / 1000).toFixed(1)}k chars`,
  );

  const messages = [
    { role: "system", content: instructions },
    { role: "user", content: userPrompt },
  ];

  // Tentar modelo primário, fallback para nano se falhar
  let response = await callModel(token, MODEL_PRIMARY, messages);

  if (!response.ok && response.status === 413) {
    console.warn(
      `${MODEL_PRIMARY} retornou 413, tentando ${MODEL_FALLBACK}...`,
    );
    response = await callModel(token, MODEL_FALLBACK, messages);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`GitHub Models API erro ${response.status}: ${text}`);
    process.exit(1);
  }

  const data = await response.json();
  const entry = data.choices?.[0]?.message?.content?.trim();

  if (!entry) {
    console.error("Resposta vazia do modelo.");
    process.exit(1);
  }

  console.log("\n--- Entrada gerada ---\n");
  console.log(entry);

  // --- Atualizar CHANGELOG.md ---
  let existing = "";
  try {
    existing = await readFile("CHANGELOG.md", "utf8");
  } catch {
    existing = "# Changelog\n\nGerado automaticamente por IA a cada push.\n";
  }

  // Inserir nova entrada após o header e antes das entradas anteriores
  const lines = existing.split("\n");
  const firstEntryIdx = lines.findIndex(
    (line, i) => i > 0 && line.startsWith("## "),
  );

  let updated;
  if (firstEntryIdx === -1) {
    // Nenhuma entrada anterior — append após header
    updated = existing.trimEnd() + "\n\n" + entry + "\n";
  } else {
    // Inserir antes da primeira entrada existente
    const header = lines.slice(0, firstEntryIdx).join("\n").trimEnd();
    const rest = lines.slice(firstEntryIdx).join("\n");
    updated = header + "\n\n" + entry + "\n\n" + rest;
  }

  await writeFile("CHANGELOG.md", updated, "utf8");
  console.log("\nCHANGELOG.md atualizado.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
