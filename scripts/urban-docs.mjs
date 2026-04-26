import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { data } = await s
  .from("documents")
  .select("metadata,original_file_url,original_mime_type,original_file_size")
  .eq("client_id", "bcc165fe-3adb-498c-938e-f165cd5920f7");
const seen = new Map();
for (const r of data || []) {
  const m = r.metadata || {};
  const k = m.filename || "(no-filename)";
  if (!seen.has(k))
    seen.set(k, {
      filename: k,
      mime_meta: m.original_mime_type || m.mimeType,
      mime_col: r.original_mime_type,
      url: r.original_file_url || m.original_file_url,
      size: r.original_file_size || m.original_file_size,
    });
}
for (const v of seen.values()) console.log(v);
console.log("unique files:", seen.size, " total chunks:", (data || []).length);
