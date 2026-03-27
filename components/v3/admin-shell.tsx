"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import { tolerantData } from "@/lib/schema-tolerance";

export function AdminShellV3({ children }: PropsWithChildren) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push("/login");
      const profileRes = await supabase.from("profiles").select("role").eq("user_id", authData.user.id).single();
      const profileResult = tolerantData(profileRes.data ? [profileRes.data as { role?: string }] : [], profileRes.error, [], "Perfil");
      if (profileResult.warning) setWarning(profileResult.warning);
      const role = profileResult.data[0]?.role;
      if (role !== "admin") return router.push("/operator");
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return <main className="cv3-shell"><div className="cv3-container"><section className="cv3-card">Carregando v3...</section></div></main>;
  }

  return (
    <main className="cv3-shell">
      <div className="cv3-container">
        <header className="cv3-header">
          <div>
            <p className="cv3-eyebrow">CENTRAL VIAGEM • V3</p>
            <h1 className="cv3-title">Nova fundação visual</h1>
            <p className="cv3-subtitle">Reset completo com padrão corporativo clean.</p>
          </div>
        </header>
        {warning && <section className="cv3-card border border-amber-300/50 bg-amber-100/30 text-sm">{warning}</section>}
        {children}
      </div>
    </main>
  );
}
