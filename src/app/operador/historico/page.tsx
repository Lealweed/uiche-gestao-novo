'use client'

import React, { useEffect, useState } from 'react'
import { History, Search, Filter, Ticket, ChevronRight, CheckCircle2, MoreVertical, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function HistoricoVendasPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const loadTransactions = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('transactions')
                .select('id, amount, payment_method, sold_at, note, companies(name)')
                .order('sold_at', { ascending: false })
            
            if (error) {
                console.error('Erro ao listar transações:', error)
            } else {
                // Parse das notas JSON
                const parsedData = (data || []).map(t => {
                    let parsedNote: any = {}
                    try {
                        if (typeof t.note === 'string') {
                            parsedNote = JSON.parse(t.note)
                        } else if (typeof t.note === 'object') {
                            parsedNote = t.note
                        }
                    } catch (e) {
                        console.error('Erro ao converter JSON de note', e)
                    }
                    return {
                        ...t,
                        passageiro: parsedNote?.passageiro || 'NÃO INFORMADO',
                        destino: parsedNote?.destino || 'NÃO INFORMADO'
                    }
                })
                setTransactions(parsedData)
            }
            setLoading(false)
        }
        loadTransactions()
    }, [supabase])

    const filteredTransactions = transactions.filter(t => 
        t.passageiro?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#222834]">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Histórico de Bilhetes</h2>
                    <p className="text-slate-500 mt-1 font-medium">Controle de emissão e auditoria de transações realizadas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar passageiro, destino..." 
                            className="bg-[#0B0E14] border border-[#222834] rounded-xl pl-12 pr-6 py-4 text-white placeholder:text-slate-700 outline-none focus:ring-1 focus:ring-amber-500/30 transition-all w-full md:w-[320px] shadow-inner font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-4 rounded-xl bg-[#0B0E14] hover:bg-[#1A2333] border border-[#222834] text-slate-500 hover:text-white transition-all shadow-lg active:scale-95">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Listagem Estilizada */}
            <div className="rounded-2xl border border-[#222834] bg-[#151923] overflow-hidden shadow-2xl relative">
                {/* Overlay Decoração */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0B0E14] text-slate-500 text-[10px] uppercase font-bold tracking-[0.15em] border-b border-[#222834]">
                                <th className="px-8 py-4">Bilhete ID / Protocolo</th>
                                <th className="px-8 py-4">Passageiro & Status</th>
                                <th className="px-8 py-4">Empresa / Destino</th>
                                <th className="px-8 py-4">Emissão</th>
                                <th className="px-8 py-4 text-right">Valor Total</th>
                                <th className="px-8 py-4 text-center">Forma</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222834] font-mono text-sm leading-relaxed">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="h-20 bg-black/10"></td>
                                    </tr>
                                ))
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-8 py-24 text-center text-slate-600 italic font-sans font-bold uppercase tracking-widest text-[10px]">
                                        Nenhum registro encontrado no banco de dados.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((v) => (
                                    <tr key={v.id} className="hover:bg-[#1A1F2E]/30 transition-colors group">
                                        <td className="px-8 py-6 text-slate-500 group-hover:text-slate-300 font-mono text-xs font-bold leading-none">
                                            #{String(v.id).slice(-8).toUpperCase()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold font-sans tracking-tight truncate max-w-[200px]">{v.passageiro}</span>
                                                <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-1">Check-in Válido</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-sans">
                                            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                                                <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                                    <Ticket className="w-3.5 h-3.5" />
                                                </div>
                                                {v.companies?.name || 'Viação Desconhecida'}
                                            </div>
                                            <div className="text-[11px] text-slate-600 mt-2 font-bold uppercase tracking-wider truncate max-w-[150px]">{v.destino}</div>
                                        </td>
                                        <td className="px-8 py-6 text-slate-500 group-hover:text-slate-400 font-medium">{new Date(v.sold_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td className="px-8 py-6 text-right font-bold text-white tracking-tighter">
                                            {formatCurrency(Number(v.amount) || 0)}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className="px-3 py-1.5 bg-[#0B0E14] border border-[#222834] rounded-lg text-[9px] text-slate-400 uppercase font-black tracking-widest shadow-inner group-hover:text-white transition-colors">
                                                    {v.payment_method}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-emerald-500 font-sans text-[10px] font-black tracking-widest bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10 w-fit">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                CONCLUÍDO
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <button className="p-2 hover:bg-[#1A2333] rounded-lg text-slate-700 hover:text-amber-500 transition-all border border-transparent hover:border-[#222834]">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center justify-between text-slate-600 px-6 font-bold uppercase tracking-widest text-[10px]">
                <span>Log: {filteredTransactions.length} Entradas localizadas</span>
                <div className="flex gap-3">
                    <button className="px-6 py-2 bg-[#0B0E14] border border-[#222834] rounded-xl text-[10px] hover:bg-[#1A2333] hover:text-white disabled:opacity-20 transition-all active:scale-95">Anterior</button>
                    <button className="px-6 py-2 bg-[#0B0E14] border border-[#222834] rounded-xl text-[10px] hover:bg-[#1A2333] hover:text-white disabled:opacity-20 transition-all active:scale-95">Próxima</button>
                </div>
            </div>

        </div>
    )
}
