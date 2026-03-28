'use client'

import React, { useEffect, useState } from 'react'
import { 
    Banknote, 
    Ticket, 
    TrendingUp,
    Clock,
    History,
    PlusCircle,
    ArrowUpCircle,
    ArrowDownCircle,
    ChevronRight,
    CheckCircle2,
    Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function OperadorDashboard() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({ total: 0, count: 0 })
    const [vendas, setVendas] = useState<any[]>([])

    // Form fields
    const [formLoading, setFormLoading] = useState(false)
    const [empresa, setEmpresa] = useState('Ouro e Prata')
    const [formaPgto, setFormaPgto] = useState('Pix')
    const [valor, setValor] = useState('')
    const [feedback, setFeedback] = useState({ type: '', message: '' })

    // Estados do Ponto (Simulado)
    const [timestamps, setTimestamps] = useState({ entrada: '--:--', pausa: '--:--', retorno: '--:--', saida: '--:--' })

    const loadDashboardDados = async () => {
        setLoading(true)
        try {
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)
            const dataIso = hoje.toISOString()

            const { data: vendasData, error: vError } = await supabase
                .from('vendas')
                .select('*')
                .gte('created_at', dataIso)
                .order('created_at', { ascending: false })

            if (vError) throw vError

            if (vendasData) {
                const total = vendasData.reduce((acc, v) => acc + (Number(v.valor) || 0), 0)
                setDashboardData({ total, count: vendasData.length })
                setVendas(vendasData.slice(0, 5))
            }
        } catch (err) {
            console.error('Erro ao carregar dados:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDashboardDados()
    }, [])

    const handleQuickVenda = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormLoading(true)
        setFeedback({ type: '', message: '' })

        const valNum = parseFloat(valor.replace(',', '.'))
        if (!valNum || isNaN(valNum)) {
            setFeedback({ type: 'error', message: 'Valor inválido!' })
            setFormLoading(false)
            return
        }

        try {
            const { error } = await supabase
                .from('vendas')
                .insert({
                    empresa_parceira: empresa,
                    forma_pagamento: formaPgto,
                    valor: valNum,
                    destino: 'Venda Direta', // Valor padrão para lançamento rápido
                    passageiro: 'Diversos' // Valor padrão
                })

            if (error) throw error

            setFeedback({ type: 'success', message: 'Lançado com sucesso!' })
            setValor('')
            loadDashboardDados()
        } catch (err) {
            setFeedback({ type: 'error', message: 'Erro ao registrar.' })
        } finally {
            setFormLoading(false)
            setTimeout(() => setFeedback({ type: '', message: '' }), 3000)
        }
    }

    const valorFormatado = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(dashboardData.total)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 1. HEADER & CARDS RESUMO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222834] pb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Resumo da Operação</h2>
                    <p className="text-slate-500 text-sm mt-1">Acompanhamento em tempo real do caixa e produtividade.</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Turno Ativo</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2 relative group rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl transition-all hover:border-amber-500/20 overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <Banknote className="w-32 h-32 text-amber-500 transform rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Faturamento Total</h3>
                        </div>
                        <div>
                            <div className="text-4xl font-bold tracking-tighter text-white mb-2 font-mono">
                                {loading ? "---" : valorFormatado}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{dashboardData.count} vendas registradas hoje</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative group rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl transition-all hover:border-blue-500/20">
                    <div className="flex flex-col justify-between h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                                <Ticket className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Passagens</h3>
                        </div>
                        <div className="text-3xl font-bold text-white tracking-tight font-mono">
                            {loading ? "0" : dashboardData.count}
                        </div>
                        <p className="text-xs text-slate-500 mt-2 uppercase tracking-tight">Recibos Emitidos</p>
                    </div>
                </div>

                <div className="relative group rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl transition-all hover:border-purple-500/20">
                    <div className="flex flex-col justify-between h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
                                <History className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Meios de Pagamento</h3>
                        </div>
                        <div className="flex gap-2 text-slate-600">
                            <PlusCircle className="w-5 h-5 text-emerald-500" />
                            <PlusCircle className="w-5 h-5 text-blue-500" />
                            <PlusCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-xs text-slate-500 mt-2 uppercase tracking-tight">Pix, Cartão, Dinheiro</p>
                    </div>
                </div>
            </div>

            {/* 2. DASHBOARD BODY - 2 COLUNAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 space-y-8">
                    {/* Histórico Recente Section */}
                    <div className="rounded-2xl border border-[#222834] bg-[#151923] overflow-hidden shadow-xl">
                        <div className="px-6 py-5 border-b border-[#222834] flex items-center justify-between bg-[#1A1F2E]/30">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-blue-400" />
                                <h3 className="font-semibold text-white">Últimos Lançamentos</h3>
                            </div>
                            <button className="text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors">
                                Ver tudo <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0B0E14] text-slate-500 text-[10px] uppercase font-bold tracking-[0.15em]">
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Viação</th>
                                        <th className="px-6 py-4 text-right">Valor</th>
                                        <th className="px-6 py-4 text-center">Forma</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222834] font-mono text-sm">
                                    {loading ? (
                                        Array(3).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse"><td colSpan={4} className="h-12 bg-[#0B0E14]/50"></td></tr>
                                        ))
                                    ) : vendas.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-600 italic">Sem registros no turno atual.</td></tr>
                                    ) : (
                                        vendas.map((v) => (
                                            <tr key={v.id} className="hover:bg-[#1A1F2E]/50 transition-colors group">
                                                <td className="px-6 py-4 text-slate-400 group-hover:text-white transition-colors">#{String(v.id).slice(-6)}</td>
                                                <td className="px-6 py-4 text-slate-500 group-hover:text-slate-200 transition-colors">{v.empresa_parceira}</td>
                                                <td className="px-6 py-4 text-right font-bold text-white transition-colors">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 uppercase">{v.forma_pagamento}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ponto Digital Section */}
                    <div className="rounded-2xl border border-[#222834] bg-[#151923] overflow-hidden shadow-xl">
                        <div className="px-6 py-5 border-b border-[#222834] flex items-center justify-between bg-[#1A1F2E]/30">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-amber-500" />
                                <h3 className="font-semibold text-white">Controle de Jornada</h3>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-center">
                                {[
                                    { label: 'Entrada', time: timestamps.entrada },
                                    { label: 'Pausa', time: timestamps.pausa },
                                    { label: 'Retorno', time: timestamps.retorno },
                                    { label: 'Saída', time: timestamps.saida }
                                ].map((p, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-[#0B0E14] border border-[#222834] shadow-inner">
                                        <span className="text-[9px] text-slate-600 uppercase font-bold tracking-[0.2em] block mb-2">{p.label}</span>
                                        <span className={cn("text-lg font-mono font-bold", p.time === '--:--' ? 'text-slate-700' : 'text-white')}>{p.time}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <button className="flex-1 min-w-[140px] px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 active:scale-95">
                                    <ArrowUpCircle className="w-5 h-5" />
                                    Bater Entrada
                                </button>
                                <button className="flex-1 min-w-[140px] px-6 py-4 bg-[#1A1F2E] hover:bg-[#222834] text-white border border-[#222834] rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    Intervalo
                                </button>
                                <button className="flex-1 min-w-[140px] px-6 py-4 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <ArrowDownCircle className="w-5 h-5" />
                                    Encerrar Dia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Atalho de Lançamento Rápido */}
                    <div className="rounded-2xl border border-[#222834] bg-[#151923] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
                        
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <PlusCircle className="text-amber-500 h-5 w-5" />
                            Lançamento Rápido
                        </h3>

                        <form onSubmit={handleQuickVenda} className="space-y-5">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Viação / Empresa</label>
                                <select 
                                    className="w-full bg-[#0B0E14] border border-[#222834] rounded-lg px-4 py-3 text-white appearance-none focus:ring-1 focus:ring-amber-500/30 outline-none transition-all cursor-pointer"
                                    value={empresa}
                                    onChange={(e) => setEmpresa(e.target.value)}
                                >
                                    <option value="Ouro e Prata">Ouro e Prata</option>
                                    <option value="Boa Esperança">Boa Esperança</option>
                                    <option value="Satélite Norte">Satélite Norte</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Forma</label>
                                    <select 
                                        className="w-full bg-[#0B0E14] border border-[#222834] rounded-lg px-4 py-3 text-white appearance-none focus:ring-1 focus:ring-amber-500/30 outline-none transition-all cursor-pointer"
                                        value={formaPgto}
                                        onChange={(e) => setFormaPgto(e.target.value)}
                                    >
                                        <option value="Pix">Pix</option>
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Cartão">Cartão</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Valor</label>
                                    <input 
                                        type="text" 
                                        placeholder="0,00" 
                                        className="w-full bg-[#0B0E14] border border-[#222834] rounded-lg px-4 py-3 text-amber-500 font-mono font-bold focus:ring-1 focus:ring-amber-500/30 outline-none transition-all placeholder:text-slate-800" 
                                        value={valor}
                                        onChange={(e) => setValor(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {feedback.message && (
                                <div className={cn(
                                    "p-3 rounded-lg text-xs font-bold text-center animate-in zoom-in-95",
                                    feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                )}>
                                    {feedback.message}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={formLoading}
                                className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50 shadow-lg shadow-amber-500/10 active:scale-[0.98]"
                            >
                                {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                Registrar Venda
                            </button>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 border-b border-[#222834] pb-3">Status do Caixa</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B0E14] border border-[#222834]">
                                <span className="text-slate-500 text-xs font-semibold">SUPRIMENTO</span>
                                <span className="text-sm font-mono text-white">R$ 150,00</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B0E14] border border-[#222834]">
                                <span className="text-slate-500 text-xs font-semibold uppercase">Sangria</span>
                                <span className="text-sm font-mono text-rose-400">R$ 0,00</span>
                            </div>
                            <div className="flex justify-between items-center p-4 rounded-xl bg-[#1A1F2E] border border-amber-500/10">
                                <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">Saldo em Tela</span>
                                <span className="text-xl font-mono font-bold text-amber-500">{valorFormatado}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
