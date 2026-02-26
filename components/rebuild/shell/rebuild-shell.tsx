"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/rebuild/admin", label: "Admin" },
  { href: "/rebuild/operator", label: "Operador" },
];

export function RebuildShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="rb-shell">
      <aside className="rb-sidebar">
        <div>
          <p className="rb-logo-overline">Central Viagens</p>
          <h1 className="rb-logo-title">Rebuild V1</h1>
        </div>

        <nav className="rb-nav" aria-label="Navegação do Rebuild">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("rb-nav-item", isActive && "active")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="rb-main-wrap">
        <header className="rb-topbar">
          <div>
            <p className="rb-topbar-overline">Fundação técnica</p>
            <p className="rb-topbar-title">Design system premium + casca navegável</p>
          </div>
        </header>
        <main className="rb-main">{children}</main>
      </div>
    </div>
  );
}
