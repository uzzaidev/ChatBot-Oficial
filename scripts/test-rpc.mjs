import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local antes de rodar este script.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sql =
  "SELECT COUNT(DISTINCT phone) AS conversas_ontem FROM messages WHERE client_id = '59ed984e-85f4-4784-ae76-2569371296af' AND (timestamp AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date - 1";

const { data, error } = await supabase.rpc("execute_readonly_query", {
  query_text: sql,
});

console.log("error:", error);
console.log("data type:", typeof data, "| isArray:", Array.isArray(data));
console.log("data raw:", data);
console.log("data JSON:", JSON.stringify(data));

// Also test what executeSql does with this
const rows = Array.isArray(data) ? data : [];
console.log("\nrows:", rows);
console.log("rowCount:", rows.length);
