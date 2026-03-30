'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  ClipboardList,
  LayoutDashboard,
  Wallet,
  Building2,
  Monitor,
  UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItem {
  icon: React.ElementType
  label: string
  href: string
}

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Visão Geral', href: '/gerencia' },
  { icon: Building2, label: 'Terminais (PDV)', href: '/gerencia/terminais' },
  { icon: Users, label: 'Operadores', href: '/gerencia/operadores' },
  { icon: Wallet, label: 'Financeiro', href: '/gerencia/financeiro' },
  { icon: ClipboardList, label: 'Auditoria', href: '/gerencia/auditoria' },
  { icon: Settings, label: 'Configurações', href: '/gerencia/configuracoes' },
]

const cadastroItems: SidebarItem[] = [
  { icon: Building2, label: 'Viações', href: '/gerencia/viacoes' },
  { icon: Monitor, label: 'Guichês', href: '/gerencia/guiches' },
  { icon: UserCheck, label: 'Equipe', href: '/gerencia/equipe' },
]

export default function GerenciaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[#0B0E14] text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1A2333] bg-[#0F131A] flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">Central Viagens</h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-[0.2em] uppercase">Gestão Admin</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                    isActive 
                      ? "bg-blue-600/10 text-blue-400" 
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-blue-400" : "group-hover:text-blue-400"
                  )} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="mt-6">
            <p className="px-3 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Cadastros Base</p>
            <nav className="space-y-1">
              {cadastroItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                      isActive 
                        ? "bg-violet-600/10 text-violet-400" 
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-violet-400" : "group-hover:text-violet-400"
                    )} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && (
                      <div className="absolute left-0 w-1 h-6 bg-violet-500 rounded-r-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-[#1A2333]">
          <button 
            onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-sm font-medium">Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,#151923_0%,#0B0E14_100%)]">
        <header className="h-16 border-b border-[#1A2333] flex items-center justify-between px-8 bg-[#0B0E14]/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-300">Painel de Gerência</h2>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-xs text-slate-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white leading-none">Administrador</span>
              <span className="text-[10px] text-blue-400/80 font-medium">Acesso Total</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">ADM</span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
