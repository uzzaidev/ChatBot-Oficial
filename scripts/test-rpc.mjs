import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vczfsmymvjvxuxlqswai.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjemZzbXltdmp2eHV4bHFzd2FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMTk1MSwiZXhwIjoyMDc5Mzc3OTUxfQ.YDhSd5praF_bWIBLVyRlKcnGvqqfTAO9qFIvYEz8M8M";

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
