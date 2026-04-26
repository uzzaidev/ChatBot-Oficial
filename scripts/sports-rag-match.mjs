import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const SPORTS = "59ed984e-85f4-4784-ae76-2569371296af";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Fetch the client's own OpenAI key from Vault (same path used by app)
const { data: clientRow } = await sb
  .from("clients")
  .select("openai_api_key_secret_id")
  .eq("id", SPORTS)
  .single();

let openaiKey = process.env.OPENAI_API_KEY;
if (clientRow?.openai_api_key_secret_id) {
  const { data, error } = await sb.rpc("get_client_secret", {
    secret_id: clientRow.openai_api_key_secret_id,
  });
  if (!error && data) {
    console.log("using SPORTS Vault OpenAI key");
    openaiKey = data;
  } else {
    console.log("vault rpc err:", error?.message);
  }
} else {
  console.log("client has no openai_api_key_secret_id; using env");
}

if (!openaiKey) {
  console.error("no OpenAI key available");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

const queries = [
  "VALORES 2025",
  "tabela de valores planos",
  "quanto custa o plano de treino",
  "planos e valores",
  "anual 2x por semana",
];

for (const q of queries) {
  console.log("\n" + "=".repeat(60));
  console.log("QUERY:", q);
  console.log("=".repeat(60));

  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q,
  });
  const vector = emb.data[0].embedding;

  for (const threshold of [0.0, 0.3, 0.5, 0.7, 0.8]) {
    const { data, error } = await sb.rpc("match_documents", {
      query_embedding: vector,
      match_threshold: threshold,
      match_count: 10,
      filter_client_id: SPORTS,
    });
    if (error) {
      console.log(`  threshold ${threshold}: ERROR ${error.message}`);
      continue;
    }
    console.log(`  threshold ${threshold}: ${data?.length ?? 0} matches`);
    if (threshold === 0.0 && data?.length) {
      for (const row of data) {
        console.log(
          `    sim=${Number(row.similarity).toFixed(4)} file=${
            row.metadata?.filename
          } preview="${row.content?.slice(0, 70).replace(/\s+/g, " ")}"`,
        );
      }
    }
  }
}
