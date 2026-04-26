import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const IDS = [
  "59ed984e-85f4-4784-ae76-2569371296af", // SPORTS TRAINING
  "bcc165fe-3adb-498c-938e-f165cd5920f7", // Urbanizadora
];

const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

// 1) tool calls bloqueados ou sent=0
const { data: tc } = await s
  .from("tool_call_traces")
  .select("trace_id, client_id, arguments, result, started_at")
  .in("client_id", IDS)
  .eq("tool_name", "buscar_documento")
  .gte("started_at", since)
  .order("started_at", { ascending: false })
  .limit(30);

console.log("=== Detalhes: query do modelo + user message + result ===\n");

for (const t of tc || []) {
  const r = t.result || {};
  const args = t.arguments || {};
  const traceId = t.trace_id;

  // Buscar a message_trace correspondente
  const { data: mt } = await s
    .from("message_traces")
    .select("user_message, generated_response, ai_model")
    .eq("id", traceId)
    .single();

  const cName = t.client_id === IDS[0] ? "SPORTS" : "URBAN";
  console.log(`[${t.started_at}] ${cName}`);
  console.log(`  user_msg: ${(mt?.user_message || "?").slice(0, 200)}`);
  console.log(
    `  tool_query: ${args.query || "?"} | type: ${args.document_type || "?"}`,
  );
  console.log(
    `  result: sent=${r.documentsSent ?? 0} found=${
      r.documentsFound ?? 0
    } reason=${r.gateReason ?? "n/a"} doc=${r.selectedDocument ?? "n/a"}`,
  );
  console.log(
    `  ai_response: ${(mt?.generated_response || "?").slice(0, 200)}\n`,
  );
}

// 2) Documentos disponíveis para esses clientes
console.log("\n=== DOCUMENTS por cliente ===");
for (const id of IDS) {
  const { data: docs, count } = await s
    .from("documents")
    .select("metadata, original_mime_type, original_file_url", {
      count: "exact",
    })
    .eq("client_id", id)
    .not("original_file_url", "is", null)
    .limit(20);

  const cName = id === IDS[0] ? "SPORTS" : "URBAN";
  console.log(`\n[${cName}] total chunks com original_file_url: ${count}`);
  const filenames = new Set();
  for (const d of docs || []) {
    if (d.metadata?.filename)
      filenames.add(`${d.metadata.filename} (${d.original_mime_type})`);
  }
  for (const f of filenames) console.log(`  - ${f}`);
}
