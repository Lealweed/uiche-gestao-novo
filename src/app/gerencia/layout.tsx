import React from "react";
import Link from "next/link";

// LEGADO: módulo mantido apenas como referência.
// Não faz parte da navegação principal nem do build operacional atual (`app/rebuild/*`).

const menuLinks = [
  { href: "/gerencia", label: "Visão Geral" },
  { href: "/gerencia/comissoes", label: "Comissões e Repasses" },
  { href: "/gerencia/equipe", label: "Gestão de Equipe" },
  { href: "/gerencia/configuracoes", label: "Configurações" },
];

export default function GerenciaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0a0f1c] to-[#1a2236] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d1a36] border-r border-[#1e293b] flex flex-col py-8 px-6 shadow-xl">
        <div className="mb-10 text-2xl font-bold text-sapphire-400 tracking-wide select-none">
          Gerência
        </div>
        <nav className="flex flex-col gap-3">
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 font-medium transition-colors hover:bg-sapphire-700/30 focus:bg-sapphire-700/40 focus:outline-none text-sapphire-300 hover:text-sapphire-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-20 flex items-center px-10 border-b border-[#1e293b] bg-[#10182a]/80 backdrop-blur-md shadow-lg">
          <h1 className="text-2xl font-semibold text-sapphire-300 tracking-wide">Painel da Gerência</h1>
        </header>
        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}

// Tailwind custom color (no CSS):
// .text-sapphire-300 { color: #4f7acb; }
// .text-sapphire-400 { color: #3161b7; }
// .hover\:bg-sapphire-700\/30 { background-color: rgba(24, 49, 104, 0.3); }
// .hover\:text-sapphire-100 { color: #eaf1ff; }
