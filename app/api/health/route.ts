import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const start = Date.now();
  const checks: Record<string, "ok" | "fail"> = {};

  // Check Supabase connectivity
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      checks.supabase = "fail";
    } else {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await supabase.from("profiles").select("user_id", { count: "exact", head: true });
      checks.supabase = error ? "fail" : "ok";
    }
  } catch {
    checks.supabase = "fail";
  }

  // Check env vars
  const requiredEnvs = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  checks.env = requiredEnvs.every((key) => !!process.env[key]) ? "ok" : "fail";

  const allOk = Object.values(checks).every((v) => v === "ok");
  const latency = Date.now() - start;

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      checks,
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    { status: allOk ? 200 : 503 },
  );
}
