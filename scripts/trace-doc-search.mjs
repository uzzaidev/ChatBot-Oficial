// Diagnóstico: valida se a hipótese (enable_document_search=false / wrong_stage gate) é mesmo a causa
// dos clientes que pararam de mandar foto/documento.
//
// Uso: node scripts/trace-doc-search.mjs
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TARGET_SLUGS = ["sportstraining", "urbanizadora", "facchin"];

const main = async () => {
  // 1) Resolve client IDs pelos slugs/nomes
  const { data: clients, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, slug, settings")
    .or(
      TARGET_SLUGS.map((s) => `slug.ilike.%${s}%,name.ilike.%${s}%`).join(","),
    );

  if (clientErr) throw clientErr;
  if (!clients?.length) {
    console.log("Nenhum cliente encontrado para:", TARGET_SLUGS);
    return;
  }

  console.log("=== CLIENTES ENCONTRADOS ===");
  for (const c of clients) {
    const s = c.settings || {};
    console.log(
      `${c.name} (${c.slug || "no-slug"}) | client_id=${
        c.id
      } | settings.enable_document_search=${
        s.enable_document_search
      } | enable_tools=${s.enable_tools} | enable_rag=${s.enable_rag}`,
    );
  }
  console.log();

  // 2) Estado dos AGENTES de cada cliente
  const ids = clients.map((c) => c.id);
  const { data: agents } = await supabase
    .from("agents")
    .select(
      "id, client_id, name, is_active, is_archived, enable_tools, enable_rag, enable_document_search, enable_human_handoff",
    )
    .in("client_id", ids);

  console.log("=== AGENTES ===");
  for (const a of agents || []) {
    const c = clients.find((x) => x.id === a.client_id);
    console.log(
      `[${c?.name}] ${a.name} | active=${a.is_active} archived=${a.is_archived} | tools=${a.enable_tools} rag=${a.enable_rag} doc_search=${a.enable_document_search} handoff=${a.enable_human_handoff}`,
    );
  }
  console.log();

  // 3) Logs recentes da tool buscar_documento (últimos 7 dias)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from("execution_logs")
    .select(
      "execution_id, node_name, status, timestamp, output_data, metadata, client_id",
    )
    .in("client_id", ids)
    .eq("node_name", "handleDocumentSearchToolCall")
    .gte("timestamp", since)
    .order("timestamp", { ascending: false })
    .limit(50);

  console.log(
    `=== execution_logs handleDocumentSearchToolCall (últimos 7 dias, top 50) ===`,
  );
  if (!logs?.length) {
    console.log(
      "NENHUM log encontrado. Indica fortemente que a tool buscar_documento NEM ESTAVA SENDO EXPOSTA ao modelo (enable_document_search=false bloqueava antes do tool-call).",
    );
  } else {
    const counts = {};
    for (const l of logs) {
      const out = l.output_data || {};
      const reason = out.documentGateReason || "no_output";
      const decision = out.documentGateDecision || "no_output";
      const sent = out.documentsSent ?? "n/a";
      const c = clients.find((x) => x.id === l.client_id);
      const key = `${c?.name}|${decision}|${reason}`;
      counts[key] = (counts[key] || 0) + 1;
      console.log(
        `${l.timestamp} | ${c?.name} | decision=${decision} | reason=${reason} | sent=${sent}`,
      );
    }
    console.log("\n--- Sumário (cliente|decision|reason → count) ---");
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`${v.toString().padStart(4)}  ${k}`));
  }
  console.log();

  // 4) Mensagens que o bot mandou nas últimas 48h contendo o trecho-bug "a pratica"
  const since48 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: badMsgs } = await supabase
    .from("messages")
    .select("created_at, client_id, content, direction")
    .in("client_id", ids)
    .eq("direction", "outbound")
    .ilike("content", "%a pratica%")
    .gte("created_at", since48)
    .order("created_at", { ascending: false })
    .limit(20);

  console.log(`=== Mensagens outbound contendo "a pratica" (últimas 48h) ===`);
  if (!badMsgs?.length) {
    console.log(
      "Nenhuma — fallback yoga-specific não foi enviado nesse período.",
    );
  } else {
    for (const m of badMsgs) {
      const c = clients.find((x) => x.id === m.client_id);
      console.log(
        `${m.created_at} | ${c?.name} | ${m.content?.slice(0, 120)}...`,
      );
    }
  }
};

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
