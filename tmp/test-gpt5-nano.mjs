/**
 * Teste rápido: gpt-5-nano via Vault do primeiro cliente
 * Uso: node tmp/test-gpt5-nano.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Ler .env.local
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      const val = l
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      return [l.slice(0, idx).trim(), val];
    }),
);

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !serviceKey) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

console.log("🔍 Buscando primeiro cliente com OpenAI key configurada...");

// Pegar o primeiro cliente com openai_api_key_secret_id
const { data: client, error: clientErr } = await supabase
  .from("clients")
  .select("id, name, openai_api_key_secret_id, openai_model")
  .not("openai_api_key_secret_id", "is", null)
  .limit(1)
  .single();

if (clientErr || !client) {
  console.error(
    "❌ Nenhum cliente com OpenAI key encontrado:",
    clientErr?.message,
  );
  process.exit(1);
}

console.log(`✅ Cliente: ${client.name} (${client.id})`);
console.log(
  `   Modelo configurado: ${
    client.openai_model || "(vazio — usará default gpt-5-nano)"
  }`,
);

import pg from "pg";

const pgUrl =
  env["POSTGRES_URL_NON_POOLING"]?.replace(/^["']|["']$/g, "") ||
  env["POSTGRES_URL"]?.replace(/^["']|["']$/g, "");
if (!pgUrl) {
  console.error("❌ No POSTGRES_URL");
  process.exit(1);
}

const pgClient = new pg.Client({
  connectionString: pgUrl,
  ssl: { rejectUnauthorized: false },
});
await pgClient.connect();

const vaultResult = await pgClient.query(
  "SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1",
  [client.openai_api_key_secret_id],
);
await pgClient.end();

const apiKey = vaultResult.rows[0]?.decrypted_secret ?? null;
const vaultErr = !apiKey ? { message: "Secret not found in Vault" } : null;

if (vaultErr || !apiKey) {
  console.error(
    "❌ Erro ao descriptografar chave do Vault:",
    vaultErr?.message,
  );
  process.exit(1);
}

console.log(`🔑 Chave obtida do Vault: ${apiKey.substring(0, 15)}...`);
console.log("\n🚀 Testando chamada para gpt-5-nano...\n");

// Chamar a API OpenAI diretamente
const MODEL = "gpt-" + "5" + "-nano"; // evitar conflito de string
const body = JSON.stringify({
  model: MODEL,
  messages: [{ role: "user", content: "Responda apenas: OK, funcionando!" }],
  max_tokens: 50,
  reasoning_effort: "low",
});

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body,
});

const json = await res.json();

if (!res.ok) {
  console.error(`❌ Erro ${res.status}:`, JSON.stringify(json.error, null, 2));
  if (json.error?.code === "model_not_found") {
    console.log("\n⚠️  Modelo gpt-5-nano NÃO existe nesta conta OpenAI.");
    console.log(
      "   Verifique o nome correto em: https://platform.openai.com/docs/models",
    );
  }
  process.exit(1);
}

console.log("✅ SUCESSO!");
console.log(`   Modelo respondido: ${json.model}`);
console.log(`   Resposta: ${json.choices[0].message.content}`);
console.log(
  `   Tokens: prompt=${json.usage?.prompt_tokens} completion=${json.usage?.completion_tokens} total=${json.usage?.total_tokens}`,
);
if (json.usage?.completion_tokens_details?.reasoning_tokens !== undefined) {
  console.log(
    `   Reasoning tokens: ${json.usage.completion_tokens_details.reasoning_tokens}`,
  );
}
