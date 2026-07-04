#!/usr/bin/env node
/**
 * pnpm backup — convenience wrapper around db/backup-complete-safe.bat
 *
 * Reads the database connection from .env.local (POSTGRES_URL / DATABASE_URL /
 * DIRECT_URL), derives the DB_* env vars the .bat expects, and runs it.
 *
 * Important: Supabase's transaction pooler (port 6543) does NOT work with
 * pg_dump. We automatically switch to the session pooler (port 5432), which
 * uses the same host/user/password and is dump-compatible.
 *
 * Usage:
 *   pnpm backup                 # label = timestamp
 *   pnpm backup 2026_06_14      # custom label (folder name)
 */

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// --- Minimal .env parser (no dependency) ---------------------------------
const parseEnvFile = (path) => {
  const out = {};
  if (!existsSync(path)) return out;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding single or double quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

const env = parseEnvFile(join(projectRoot, ".env.local"));

const connStr =
  env.POSTGRES_URL ||
  env.DATABASE_URL ||
  env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connStr) {
  console.error(
    "[backup] Nenhuma URL de conexão encontrada no .env.local (POSTGRES_URL / DATABASE_URL / DIRECT_URL).",
  );
  process.exit(1);
}

let url;
try {
  url = new URL(connStr);
} catch {
  console.error("[backup] URL de conexão inválida.");
  process.exit(1);
}

const host = url.hostname;
let port = url.port || "5432";
const dbName = decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres";
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);

// pg_dump does not work against the Supabase transaction pooler (6543).
// Switch to the session pooler (5432): same host/user/password.
if (port === "6543") {
  console.log(
    "[backup] Detectado pooler de transação (6543) — usando session pooler (5432) para compatibilidade com pg_dump.",
  );
  port = "5432";
}

if (!host || !user || !password) {
  console.error(
    "[backup] Faltam host/usuário/senha na URL de conexão. Verifique POSTGRES_URL no .env.local.",
  );
  process.exit(1);
}

// --- Pick the newest pg_dump available (Program Files OR scoop) -----------
// pg_dump refuses to dump a server newer than itself, so we must use the
// highest version installed. The .bat only scans Program Files, so we resolve
// it here (covering scoop too) and pass it via PG_BIN.
const pgDumpCandidates = [
  ...["18", "17", "16", "15", "14"].map((v) =>
    join("C:\\Program Files\\PostgreSQL", v, "bin", "pg_dump.exe"),
  ),
  join(homedir(), "scoop", "apps", "postgresql", "current", "bin", "pg_dump.exe"),
  join(homedir(), "scoop", "shims", "pg_dump.exe"),
];

const pgDumpMajor = (exe) => {
  try {
    const out = execFileSync(exe, ["--version"], { encoding: "utf8" });
    const m = out.match(/(\d+)\.\d+/);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
};

let bestBin = null;
let bestMajor = 0;
for (const exe of pgDumpCandidates) {
  if (!existsSync(exe)) continue;
  const major = pgDumpMajor(exe);
  if (major > bestMajor) {
    bestMajor = major;
    bestBin = dirname(exe);
  }
}

if (bestBin) {
  console.log(`[backup] Usando pg_dump ${bestMajor} em: ${bestBin}`);
} else {
  console.log(
    "[backup] Nenhum pg_dump localizado nos caminhos conhecidos — deixando o .bat auto-detectar.",
  );
}

const label = process.argv[2] || "";
const batPath = join(projectRoot, "db", "backup-complete-safe.bat");

const child = spawn(batPath, label ? [label] : [], {
  cwd: join(projectRoot, "db"),
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DB_HOST: host,
    DB_PORT: port,
    DB_NAME: dbName,
    DB_USER: user,
    PGPASSWORD: password,
    PGSSLMODE: "require", // Supabase requires SSL
    ...(bestBin ? { PG_BIN: bestBin } : {}),
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error("[backup] Falha ao iniciar o backup:", err.message);
  process.exit(1);
});
