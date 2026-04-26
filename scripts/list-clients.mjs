import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { data, error } = await s
  .from("clients")
  .select("id,name,slug")
  .order("name");
if (error) console.error(error);
console.log("Total:", data?.length);
data?.forEach((c) => console.log(c.name, "|", c.slug, "|", c.id));
