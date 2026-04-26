// v2 - usa message_traces / tool_call_traces e outras tabelas
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PATTERNS = ["sport", "urbaniz", "facchin", "vitoria"];

const main = async () => {
  // 1) Clientes
  const TARGET_IDS = [
    "59ed984e-85f4-4784-ae76-2569371296af", // SPORTS TRAINING
    "bcc165fe-3adb-498c-938e-f165cd5920f7", // Urbanizadora Vitoria
    "0c17ca30-ad42-48c9-8e40-8c83e3e11da2", // Umana Rio Branco (legado yoga p/ comparar)
  ];
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug, settings")
    .in("id", TARGET_IDS);

  console.log("=== CLIENTES ===");
  for (const c of clients || []) {
    const s = c.settings || {};
    console.log(
      `${c.name} | settings.enable_doc_search=${s.enable_document_search} tools=${s.enable_tools} rag=${s.enable_rag}`,
    );
    console.log(`  client_id=${c.id}`);
  }
  console.log();

  if (!clients?.length) return;
  const ids = clients.map((c) => c.id);

  // 2) Agentes
  const { data: agents } = await supabase
    .from("agents")
    .select(
      "id, client_id, name, is_active, is_archived, enable_tools, enable_rag, enable_document_search",
    )
    .in("client_id", ids);

  console.log("=== AGENTES ===");
  for (const a of agents || []) {
    const c = clients.find((x) => x.id === a.client_id);
    console.log(
      `[${c?.name}] ${a.name} | active=${a.is_active} archived=${a.is_archived} | tools=${a.enable_tools} rag=${a.enable_rag} doc_search=${a.enable_document_search}`,
    );
  }
  console.log();

  // 3) Tool calls de buscar_documento (últimos 14 dias)
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: toolCalls, error: tcErr } = await supabase
    .from("tool_call_traces")
    .select("client_id, tool_name, status, result, started_at")
    .in("client_id", ids)
    .eq("tool_name", "buscar_documento")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(200);

  if (tcErr) console.log("tool_call_traces err:", tcErr.message);

  console.log(`=== tool_call_traces buscar_documento (14d, top 200) ===`);
  if (!toolCalls?.length) {
    console.log(
      "ZERO tool calls de buscar_documento nos últimos 14 dias.\n" +
        "Confirma a hipótese: a tool não estava sendo exposta (enable_document_search=false antes da migration/refactor).",
    );
  } else {
    const summary = {};
    for (const t of toolCalls) {
      const r = t.result || {};
      const decision = r.gateDecision || "n/a";
      const reason = r.gateReason || "n/a";
      const sent = r.documentsSent ?? 0;
      const c = clients.find((x) => x.id === t.client_id);
      const key = `${c?.name}|decision=${decision}|reason=${reason}|sent=${sent}`;
      summary[key] = (summary[key] || 0) + 1;
    }
    console.log("--- Sumário ---");
    Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`${v.toString().padStart(4)}  ${k}`));
    console.log("\n--- Últimos 10 ---");
    toolCalls.slice(0, 10).forEach((t) => {
      const c = clients.find((x) => x.id === t.client_id);
      const r = t.result || {};
      console.log(
        `${t.started_at} | ${c?.name} | sent=${r.documentsSent ?? 0} reason=${
          r.gateReason ?? "n/a"
        } doc=${r.selectedDocument ?? "n/a"}`,
      );
    });
  }
  console.log();

  // 4) Mensagens com fallbacks suspeitos (ultimas 72h)
  const since72 = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const phrases = [
    "a pratica",
    "a prática",
    "antes de te enviar",
    "antes de te mandar",
  ];
  const orPhrase = phrases.map((p) => `content.ilike.%${p}%`).join(",");

  const { data: msgs, error: mErr } = await supabase
    .from("messages")
    .select("created_at, client_id, content, direction, role")
    .in("client_id", ids)
    .or(orPhrase)
    .gte("created_at", since72)
    .order("created_at", { ascending: false })
    .limit(30);

  console.log(
    `=== messages com fallback "a pratica" / "antes de te enviar" (72h) ===`,
  );
  if (mErr) console.log("err:", mErr.message);
  if (!msgs?.length) {
    console.log("Nenhuma — fallback yoga não foi enviado nesse período.");
  } else {
    for (const m of msgs) {
      const c = clients.find((x) => x.id === m.client_id);
      console.log(
        `${m.created_at} | ${c?.name} | dir=${m.direction || m.role} | ${(
          m.content || ""
        ).slice(0, 140)}`,
      );
    }
  }
  console.log();

  // 5) Histograma de mensagens outbound recentes (sample) por cliente
  console.log(`=== Sample 5 últimas outbound de cada cliente ===`);
  for (const c of clients) {
    const { data: out } = await supabase
      .from("messages")
      .select("created_at, content, direction, role")
      .eq("client_id", c.id)
      .gte("created_at", since72)
      .order("created_at", { ascending: false })
      .limit(5);
    console.log(`\n[${c.name}]`);
    if (!out?.length) {
      console.log("  (sem mensagens 72h)");
      continue;
    }
    for (const m of out) {
      console.log(
        `  ${m.created_at} | ${m.direction || m.role} | ${(
          m.content || ""
        ).slice(0, 110)}`,
      );
    }
  }
};

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
