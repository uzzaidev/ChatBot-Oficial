// Gera um diagrama .excalidraw da arquitetura do UzzApp.
// Uso: node scripts/gen-excalidraw.mjs
import { writeFileSync } from "node:fs";

let seedCounter = 1;
const rnd = () => Math.floor(Math.random() * 2 ** 31);
const nid = (p) => `${p}-${seedCounter++}`;

const elements = [];
const boxIndex = {}; // id -> {x,y,w,h}

const base = (over) => ({
  angle: 0,
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: { type: 3 },
  seed: rnd(),
  version: 1,
  versionNonce: rnd(),
  isDeleted: false,
  boundElements: [],
  updated: Date.now(),
  link: null,
  locked: false,
  ...over,
});

// Cria retângulo + texto centralizado vinculado.
function box(id, x, y, w, h, label, { bg = "#ffec99", stroke = "#f08c00", fs = 16 } = {}) {
  const rectId = id;
  const textId = nid("t");
  const rect = base({
    id: rectId,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: stroke,
    backgroundColor: bg,
    boundElements: [{ type: "text", id: textId }],
  });
  const text = base({
    id: textId,
    type: "text",
    x: x + 8,
    y: y + h / 2 - (label.split("\n").length * fs * 1.25) / 2,
    width: w - 16,
    height: label.split("\n").length * fs * 1.25,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    roundness: null,
    fontSize: fs,
    fontFamily: 2,
    text: label,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: rectId,
    originalText: label,
    lineHeight: 1.25,
    baseline: fs,
  });
  elements.push(rect, text);
  boxIndex[id] = { x, y, w, h };
  return id;
}

function anchorPoint(id, a) {
  const b = boxIndex[id];
  switch (a) {
    case "top": return [b.x + b.w / 2, b.y];
    case "bottom": return [b.x + b.w / 2, b.y + b.h];
    case "left": return [b.x, b.y + b.h / 2];
    case "right": return [b.x + b.w, b.y + b.h / 2];
    default: return [b.x + b.w / 2, b.y + b.h / 2];
  }
}

function arrow(fromId, fromA, toId, toA, { color = "#495057", dashed = false, label = null } = {}) {
  const [sx, sy] = anchorPoint(fromId, fromA);
  const [ex, ey] = anchorPoint(toId, toA);
  const arrId = nid("a");
  const el = base({
    id: arrId,
    type: "arrow",
    x: sx,
    y: sy,
    width: Math.abs(ex - sx),
    height: Math.abs(ey - sy),
    strokeColor: color,
    backgroundColor: "transparent",
    strokeStyle: dashed ? "dashed" : "solid",
    roundness: { type: 2 },
    points: [
      [0, 0],
      [ex - sx, ey - sy],
    ],
    lastCommittedPoint: null,
    startBinding: { elementId: fromId, focus: 0, gap: 6 },
    endBinding: { elementId: toId, focus: 0, gap: 6 },
    startArrowhead: null,
    endArrowhead: "arrow",
  });
  // registra binding nos boxes
  const reg = (bid) => {
    const r = elements.find((e) => e.id === bid);
    if (r) r.boundElements = [...(r.boundElements || []), { type: "arrow", id: arrId }];
  };
  reg(fromId);
  reg(toId);
  elements.push(el);
  if (label) {
    const midx = (sx + ex) / 2;
    const midy = (sy + ey) / 2;
    elements.push(
      base({
        id: nid("lbl"),
        type: "text",
        x: midx - 40,
        y: midy - 10,
        width: 80,
        height: 18,
        roundness: null,
        backgroundColor: "transparent",
        fontSize: 12,
        fontFamily: 2,
        text: label,
        textAlign: "center",
        verticalAlign: "middle",
        originalText: label,
        lineHeight: 1.25,
        baseline: 12,
        strokeColor: color,
      })
    );
  }
  return arrId;
}

function title(x, y, text, fs = 28) {
  elements.push(
    base({
      id: nid("title"),
      type: "text",
      x,
      y,
      width: 700,
      height: fs * 1.25,
      roundness: null,
      backgroundColor: "transparent",
      fontSize: fs,
      fontFamily: 2,
      text,
      textAlign: "left",
      verticalAlign: "top",
      originalText: text,
      lineHeight: 1.25,
      baseline: fs,
      strokeColor: "#1e1e1e",
    })
  );
}

// ---------- Paletas ----------
const C = {
  in: { bg: "#a5d8ff", stroke: "#1971c2" },
  hook: { bg: "#d0bfff", stroke: "#6741d9" },
  node: { bg: "#ffec99", stroke: "#f08c00" },
  ai: { bg: "#b2f2bb", stroke: "#2f9e44" },
  tools: { bg: "#ffd8a8", stroke: "#e8590c" },
  out: { bg: "#99e9f2", stroke: "#0c8599" },
  db: { bg: "#b2f2bb", stroke: "#2f9e44" },
  redis: { bg: "#ffc9c9", stroke: "#e03131" },
  llm: { bg: "#96f2d7", stroke: "#0ca678" },
  ext: { bg: "#e9ecef", stroke: "#868e96" },
  dash: { bg: "#eebefa", stroke: "#9c36b5" },
};

// ============ TÍTULO ============
title(420, -90, "UzzApp — Arquitetura do Chatbot SaaS Multi-tenant (WhatsApp)", 30);
title(420, -48, "WhatsApp ➜ Webhook ➜ chatbotFlow (pipeline de nós) ➜ IA ➜ resposta", 16);

// ============ COLUNA ENTRADA (esquerda) ============
const LX = 40;
box("usuario", LX, 40, 240, 70, "📱 Usuário\n(WhatsApp)", C.in);
box("meta", LX, 160, 240, 80, "Meta WhatsApp\nBusiness API (Cloud v18)", C.in);
box(
  "webhook",
  LX,
  290,
  240,
  170,
  "🔔 Webhook\n/api/webhook/[clientId]\n\n• Valida HMAC (X-Hub-Sig-256)\n• Dedup (Redis + Postgres)\n• Carrega config (Vault)\n• Roteia: status / reação / msg",
  C.hook
);

// Bridge financeiro (curto-circuito)
box(
  "financeiro",
  LX,
  520,
  240,
  100,
  "💰 Agente Financeiro\ngestao.luisfboff.com\n(curto-circuito p/ dono)",
  C.ext
);

// Dashboard
box(
  "dashboard",
  LX,
  720,
  240,
  200,
  "🖥️ Dashboard (Next.js)\n/dashboard\n\n• Flow Architecture (Mermaid)\n• Knowledge — upload RAG\n• Conversas / CRM\n• Quality / Traces\n• Config multi-tenant",
  C.dash
);

// ============ PIPELINE CENTRAL ============
const CX = 420;
const CW = 320;
let y = 40;
const step = (h, gap = 26) => {
  const cur = y;
  y += h + gap;
  return cur;
};

box("flow", CX, step(60), CW, 60, "🤖 chatbotFlow.processChatbotMessage()", C.hook);
box("n12", CX, step(70), CW, 70, "1–2 · Filtra status + Parse Message\n(texto / áudio / imagem / doc)", C.node);
box("bhours", CX, step(56), CW, 56, "2.5 · Business Hours (horário)", C.node);
box("n3", CX, step(80), CW, 80, "3 · Check/Create Customer\n+ CRM card + captura lead (Meta Ads)", C.node);
box("route", CX, step(70), CW, 70, "Roteamento por status\nbot · humano · fluxo_inicial", C.node);
box("media", CX, step(86), CW, 86, "4 · Process Media\nWhisper (áudio) · GPT-4o Vision (img)\nPDF · upload → Storage", C.node);
box("norm", CX, step(50), CW, 50, "5 · Normalize Message", C.node);
box("handoff", CX, step(70), CW, 70, "6 · Check Human Handoff\n(se humano → salva e PARA o bot)", C.node);
box("redis", CX, step(56), CW, 56, "7 · Push to Redis + debounce", C.node);
box("saveuser", CX, step(50), CW, 50, "8 · Save User Message", C.node);
box("batch", CX, step(70), CW, 70, "9 · Batch Messages (~10–30s)\nagrupa mensagens seguidas", C.node);
box("histrag", CX, step(80), CW, 80, "10–11 · Chat History + RAG\n(pgvector · top-K similaridade)", C.node);
box("intent", CX, step(60), CW, 60, "10.5–10.6 · Continuity + Intent", C.node);
box("ai", CX, step(80), CW, 80, "12 · Generate AI Response\nOpenAI / Groq (+ tools)", C.ai);
box("repeat", CX, step(50), CW, 50, "12.5 · Detect Repetition", C.node);
box(
  "tools",
  CX,
  step(110),
  CW,
  110,
  "🛠️ Tool calls?\n• transferir_atendimento (handoff)\n• buscar_conhecimento (RAG)\n• buscar_documento\n• calendário / TTS",
  C.tools
);
box("format", CX, step(70), CW, 70, "13 · Format Response\nsplit \\n\\n · remove tool calls", C.node);
box("send", CX, step(80), CW, 80, "14 · Send + Save WhatsApp\n(intercalado · anti race-condition)", C.out);

// ============ SERVIÇOS (direita) ============
const RX = 880;
box(
  "supabase",
  RX,
  300,
  280,
  190,
  "🗄️ Supabase\n• Postgres (multi-tenant + RLS)\n• Vault (chaves por cliente)\n• pgvector (RAG / embeddings)\n• Storage (mídia)\n• tabelas PT: clientes_whatsapp,\n  n8n_chat_histories, documents",
  C.db
);
box("redissvc", RX, 540, 280, 80, "⚡ Redis\nbatching · dedup · debounce", C.redis);
box("openai", RX, 660, 280, 90, "🧠 OpenAI\nWhisper · GPT-4o Vision\nEmbeddings · LLM", C.llm);
box("groq", RX, 780, 280, 70, "🦙 Groq\nLlama 3.3 70B", C.llm);
box("gmail", RX, 880, 280, 64, "📧 Gmail (notificação handoff)", C.ext);
box(
  "trace",
  RX,
  980,
  280,
  90,
  "📊 Observability\ntraces · usage_logs · CRM\n(/dashboard/quality)",
  C.ext
);

// ============ ARROWS ============
// Entrada
arrow("usuario", "bottom", "meta", "top");
arrow("meta", "bottom", "webhook", "top");
arrow("webhook", "right", "flow", "left");

// Pipeline vertical
const chain = [
  "flow", "n12", "bhours", "n3", "route", "media", "norm", "handoff",
  "redis", "saveuser", "batch", "histrag", "intent", "ai", "repeat",
  "tools", "format", "send",
];
for (let i = 0; i < chain.length - 1; i++) {
  arrow(chain[i], "bottom", chain[i + 1], "top");
}

// Resposta de volta ao usuário
arrow("send", "left", "meta", "right", { color: "#0c8599", label: "resposta" });

// Bridge financeiro
arrow("n12", "left", "financeiro", "top", { color: "#868e96", dashed: true, label: "dono" });

// Serviços (linhas tracejadas = dependências)
const dep = (a, b, c = "#2f9e44") => arrow(a, "right", b, "left", { color: c, dashed: true });
dep("media", "openai", "#0ca678");
dep("media", "supabase");
dep("histrag", "supabase");
dep("histrag", "openai", "#0ca678");
dep("ai", "openai", "#0ca678");
arrow("ai", "right", "groq", "left", { color: "#0ca678", dashed: true });
dep("batch", "redissvc", "#e03131");
arrow("redis", "right", "redissvc", "left", { color: "#e03131", dashed: true });
dep("saveuser", "supabase");
arrow("tools", "right", "gmail", "left", { color: "#868e96", dashed: true, label: "handoff" });
dep("tools", "supabase");
arrow("send", "right", "supabase", "left", { color: "#2f9e44", dashed: true });
arrow("flow", "right", "trace", "left", { color: "#868e96", dashed: true, label: "trace" });

// Dashboard ↔ Supabase
arrow("dashboard", "right", "supabase", "left", { color: "#9c36b5", dashed: true });
arrow("webhook", "bottom", "financeiro", "top", { color: "#868e96", dashed: true });

// ============ SAÍDA ============
const doc = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
  files: {},
};

writeFileSync("UzzApp-Arquitetura.excalidraw", JSON.stringify(doc, null, 2), "utf8");
console.log(`OK — ${elements.length} elementos gravados em UzzApp-Arquitetura.excalidraw`);
