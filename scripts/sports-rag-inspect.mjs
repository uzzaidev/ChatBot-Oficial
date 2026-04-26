import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SPORTS = "59ed984e-85f4-4784-ae76-2569371296af";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

console.log("=".repeat(60));
console.log("SPORTS TRAINING — RAG inventory");
console.log("=".repeat(60));

const { data, error } = await s
  .from("documents")
  .select(
    "id, content, metadata, original_file_url, original_mime_type, original_file_size, embedding",
  )
  .eq("client_id", SPORTS);

if (error) {
  console.error("query error:", error);
  process.exit(1);
}

console.log(`\nTotal chunks (rows): ${data?.length ?? 0}`);

const byFile = new Map();
let nullEmb = 0;
let withEmb = 0;
for (const r of data || []) {
  const m = r.metadata || {};
  const fname = m.filename || m.original_filename || "(no-filename)";
  if (r.embedding === null || r.embedding === undefined) nullEmb++;
  else withEmb++;
  if (!byFile.has(fname)) {
    byFile.set(fname, {
      filename: fname,
      url: r.original_file_url,
      mime: r.original_mime_type || m.mimeType,
      size: r.original_file_size || m.size,
      chunks: 0,
      hasEmbedding: 0,
      noEmbedding: 0,
      sampleContent: r.content?.slice(0, 160),
      docType: m.documentType,
    });
  }
  const e = byFile.get(fname);
  e.chunks++;
  if (r.embedding === null || r.embedding === undefined) e.noEmbedding++;
  else e.hasEmbedding++;
}

console.log(`\nChunks with embedding: ${withEmb}`);
console.log(`Chunks WITHOUT embedding: ${nullEmb}`);
console.log(`Unique files: ${byFile.size}\n`);

console.log("--- Per file ---");
for (const v of byFile.values()) {
  console.log(`\nfile: ${v.filename}`);
  console.log(`  mime: ${v.mime}`);
  console.log(`  size: ${v.size}`);
  console.log(`  docType: ${v.docType}`);
  console.log(
    `  chunks: ${v.chunks} (with emb: ${v.hasEmbedding}, no emb: ${v.noEmbedding})`,
  );
  console.log(`  url: ${v.url}`);
  console.log(`  sample: ${v.sampleContent}`);
}

console.log("\n");
console.log("=".repeat(60));
console.log("Distinct values of metadata.documentType for SPORTS");
console.log("=".repeat(60));
const docTypes = new Map();
for (const r of data || []) {
  const t = r.metadata?.documentType ?? "(null)";
  docTypes.set(t, (docTypes.get(t) ?? 0) + 1);
}
for (const [k, v] of docTypes) console.log(`  ${k}: ${v} chunks`);

console.log("\n");
console.log("=".repeat(60));
console.log("RPC match_documents test (high recall)");
console.log("=".repeat(60));

// Generate a real OpenAI embedding for the failing query, then call match_documents.
const { generateEmbedding } = await import("../src/lib/openai.ts").catch(
  () => ({ generateEmbedding: null }),
);

if (!generateEmbedding) {
  console.log(
    "(skipped: cannot import TS file from .mjs — using zero-vector probe instead)",
  );
} else {
  const emb = await generateEmbedding(
    "VALORES 2025 plano de treino",
    undefined,
    SPORTS,
  );
  console.log("embedding dim:", emb.embedding.length);
  const { data: matches } = await s.rpc("match_documents", {
    query_embedding: emb.embedding,
    match_threshold: 0.0,
    match_count: 10,
    filter_client_id: SPORTS,
  });
  console.log(`matches @ threshold 0.0: ${matches?.length ?? 0}`);
  for (const m of matches || []) {
    console.log(
      `  sim=${m.similarity?.toFixed?.(3)} file=${
        m.metadata?.filename
      } preview=${m.content?.slice(0, 80)}`,
    );
  }
}
