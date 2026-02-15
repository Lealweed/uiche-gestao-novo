"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export function AdminShellV3({ children }: PropsWithChildren) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push("/login");
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", authData.user.id).single();
      if (profile?.role !== "admin") return router.push("/operator");
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
        {children}
      </div>
    </main>
  );
}
