'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
    LayoutDashboard, 
    TicketPlus, 
    WalletCards, 
    Clock, 
    LogOut,
    Menu,
    ChevronDown,
    Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function OperadorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navItems = [
        { name: 'Resumo do Turno', href: '/operador', icon: LayoutDashboard },
        { name: 'Caixa PDV', href: '/operador/caixa', icon: WalletCards },
        { name: 'Histórico', href: '/operador/historico', icon: TicketPlus },
        { name: 'Ponto Digital', href: '/operador/pontos', icon: Clock },
        { name: 'Configurações', href: '/operador/config', icon: Settings },
    ]

    return (
        <div className="min-h-screen flex bg-[#0B0E14] text-slate-300 overflow-hidden font-sans">
            {/* Ambient Background Effect */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none" />

            {/* Sidebar */}
            <aside className="w-64 bg-[#151923] border-r border-[#222834] flex-shrink-0 flex flex-col z-20 hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-[#222834]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                            <span className="text-amber-500 font-bold text-lg">C</span>
                        </div>
                        <span className="text-white font-bold text-lg tracking-tight">Central Viagens</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4">
                    <div className="mb-4 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Operação
                    </div>
                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href

                            return (
                                <Link 
                                    key={item.name} 
                                    href={item.href}
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-[#1A1F2E] text-white border border-[#222834]' 
                                            : 'text-slate-400 hover:bg-[#1A1F2E]/50 hover:text-slate-200 border border-transparent'
                                    }`}
                                >
                                    <Icon className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-amber-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                    <span>{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t border-[#222834] bg-[#0B0E14]/30">
                    <div className="flex items-center gap-3 px-3 py-2 mb-3">
                        <div className="h-9 w-9 rounded-full bg-[#1A1F2E] border border-[#222834] flex items-center justify-center text-sm font-bold text-white shadow-inner">
                            OP
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Operador Alfa</p>
                            <p className="text-xs text-slate-500 truncate italic">Caixa 01 - Matriz</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Encerrar Sessão
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen z-10 relative">
                {/* Topbar */}
                <header className="h-16 border-b border-[#222834] bg-[#0B0E14]/80 backdrop-blur-md flex items-center justify-between px-6 sm:px-8 z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-slate-400 hover:text-white transition-colors">
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="font-semibold text-lg text-white">
                            {navItems.find(n => n.href === pathname)?.name || 'Painel de Controle'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1A1F2E] border border-[#222834] rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-medium text-white">Caixa Aberto</span>
                        </div>
                        
                        <div className="h-6 w-px bg-[#222834] hidden xs:block"></div>

                        <div className="flex items-center gap-2">
                            <button className="p-2 text-slate-400 hover:text-white hover:bg-[#1A1F2E] rounded-lg transition-all relative">
                                <Settings className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-background">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
