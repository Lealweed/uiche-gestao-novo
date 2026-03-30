'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    TicketPlus,
    WalletCards,
    Clock,
    LogOut,
    Menu,
    X,
    Settings,
    History,
    ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function OperadorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    const [userName, setUserName] = useState('Operador')
    const [userEmail, setUserEmail] = useState('')
    const [hasOpenShift, setHasOpenShift] = useState<boolean | null>(null)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Operador'
            setUserName(name)
            setUserEmail(user.email || '')

            // Verificar se tem turno aberto
            supabase
                .from('shifts')
                .select('id')
                .eq('operator_id', user.id)
                .eq('status', 'open')
                .maybeSingle()
                .then(({ data }) => setHasOpenShift(!!data))
        })
    }, [pathname, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navItems = [
        { name: 'Resumo do Turno', href: '/operador', icon: LayoutDashboard },
        { name: 'Nova Passagem', href: '/operador/nova-venda', icon: TicketPlus },
        { name: 'Fluxo de Caixa', href: '/operador/caixa', icon: WalletCards },
        { name: 'Histórico', href: '/operador/historico', icon: History },
        { name: 'Ponto Digital', href: '/operador/pontos', icon: Clock },
        { name: 'Configurações', href: '/operador/config', icon: Settings },
    ]

    const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    const SidebarContent = () => (
        <>
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
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative',
                                    isActive
                                        ? 'bg-[#1A1F2E] text-white border border-[#222834]'
                                        : 'text-slate-400 hover:bg-[#1A1F2E]/50 hover:text-slate-200 border border-transparent'
                                )}
                            >
                                <Icon className={cn('mr-3 h-5 w-5 transition-colors', isActive ? 'text-amber-500' : 'text-slate-500 group-hover:text-slate-300')} />
                                <span className="flex-1">{item.name}</span>
                                {isActive && <ChevronRight className="w-3 h-3 text-amber-500/50" />}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-[#222834] bg-[#0B0E14]/30">
                <div className="flex items-center gap-3 px-3 py-2 mb-3">
                    <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-500 shadow-inner">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{userName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                hasOpenShift === true ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                            )} />
                            <p className={cn(
                                'text-xs truncate',
                                hasOpenShift === true ? 'text-emerald-400' : 'text-slate-500'
                            )}>
                                {hasOpenShift === true ? 'Turno Ativo' : hasOpenShift === false ? 'Caixa Fechado' : '...'}
                            </p>
                        </div>
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
        </>
    )

    return (
        <div className="min-h-screen flex bg-[#0B0E14] text-slate-300 overflow-hidden font-sans">
            {/* Ambient Background Effect */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none" />

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Desktop */}
            <aside className="w-64 bg-[#151923] border-r border-[#222834] flex-shrink-0 flex-col z-20 hidden md:flex">
                <SidebarContent />
            </aside>

            {/* Sidebar Mobile */}
            <aside className={cn(
                'fixed left-0 top-0 h-full w-64 bg-[#151923] border-r border-[#222834] flex flex-col z-40 transition-transform duration-300 md:hidden',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen z-10 relative">
                {/* Topbar */}
                <header className="h-16 border-b border-[#222834] bg-[#0B0E14]/80 backdrop-blur-md flex items-center justify-between px-6 sm:px-8 z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-slate-400 hover:text-white transition-colors"
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                        <h1 className="font-semibold text-lg text-white">
                            {navItems.find(n => n.href === pathname)?.name || 'Painel de Controle'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className={cn(
                            'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium',
                            hasOpenShift === true
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800/40 border-slate-700/40 text-slate-500'
                        )}>
                            <div className={cn(
                                'w-2 h-2 rounded-full',
                                hasOpenShift === true ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                            )} />
                            {hasOpenShift === true ? 'Caixa Aberto' : 'Caixa Fechado'}
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
