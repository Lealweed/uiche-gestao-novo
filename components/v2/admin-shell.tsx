"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type Item = { href: string; label: string };

const items: Item[] = [
  { href: "/v2/admin", label: "Dashboard" },
  { href: "/v2/operacoes", label: "Operações" },
  { href: "/v2/financeiro", label: "Financeiro" },
  { href: "/v2/relatorios", label: "Relatórios" },
  { href: "/v2/configuracoes", label: "Configurações" },
];

export function AdminShell({ children, title, subtitle }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push("/login");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();
      if (profile?.role !== "admin") return router.push("/operator");
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <main className="cv2-shell">
        <div className="cv2-container">
          <section className="cv2-card">Carregando painel...</section>
        </div>
      </main>
    );
  }

  return (
    <main className="cv2-shell">
      <div className="cv2-container">
        <header className="cv2-header">
          <div>
            <p className="cv2-eyebrow">CENTRAL VIAGENS • ADMIN</p>
            <h1 className="cv2-title">{title}</h1>
            <p className="cv2-subtitle">{subtitle}</p>
          </div>
          <div className="cv2-header-meta">
            <span className="cv2-pill">Operação ativa</span>
            <span className="cv2-pill muted">{todayLabel}</span>
          </div>
        </header>

        <div className="grid lg:grid-cols-[252px,1fr] gap-4">
          <aside className="cv2-sidebar h-fit lg:sticky lg:top-4">
            <p className="cv2-sidebar-title">Menu principal</p>
            <nav className="space-y-1.5">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`cv2-nav-item ${pathname === item.href ? "active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <section className="space-y-4">{children}</section>
        </div>
      </div>
    </main>
  );
}
