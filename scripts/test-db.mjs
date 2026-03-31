import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envLocalPath = path.join(process.cwd(), ".env.local");
let envData;
try {
  envData = fs.readFileSync(envLocalPath, "utf-8");
} catch(e) {
  process.exit(1);
}

const getEnv = (key) => {
  const match = envData.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"); 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('v_shift_totals').select("*").limit(1);
  const result = error ? `ERROR: ${error.message}` : 'OK';
  fs.writeFileSync("db-analysis.json", JSON.stringify({ v_shift_totals: result }), "utf-8");
}
run();
