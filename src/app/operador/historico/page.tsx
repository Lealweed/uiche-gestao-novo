'use client'

import React, { useEffect, useState } from 'react'
import { History, Search, Filter, Ticket, ChevronRight, CheckCircle2, MoreVertical, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function HistoricoVendasPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [vendas, setVendas] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const loadVendas = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('vendas')
                .select('*')
                .order('created_at', { ascending: false })
            
            if (error) console.error(error)
            else setVendas(data || [])
            setLoading(false)
        }
        loadVendas()
    }, [])

    const filteredVendas = vendas.filter(v => 
        v.passageiro?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.empresa_parceira?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/5">
                <div>
                    <h2 className="text-3xl font-bold text-white/90">Histórico de Passagens</h2>
                    <p className="text-white/40 mt-1">Consulte todos os bilhetes emitidos e transações realizadas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar passageiro, destino..." 
                            className="bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-amber-500/50 outline-none transition-all w-full md:w-[350px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 transition-all">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Listagem Estilizada */}
            <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] text-white/30 text-[11px] uppercase tracking-widest">
                                <th className="px-8 py-4 font-medium">Bilhete ID</th>
                                <th className="px-8 py-4 font-medium">Passageiro</th>
                                <th className="px-8 py-4 font-medium">Empresa / Destino</th>
                                <th className="px-8 py-4 font-medium">Data / Hora</th>
                                <th className="px-8 py-4 font-medium text-right">Valor</th>
                                <th className="px-8 py-4 font-medium text-center">Forma</th>
                                <th className="px-8 py-4 font-medium">Status</th>
                                <th className="px-8 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-sm leading-relaxed">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="h-16 bg-white/[0.02]"></td>
                                    </tr>
                                ))
                            ) : filteredVendas.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-8 py-20 text-center text-white/20 italic font-sans">
                                        Nenhum registro encontrado para sua busca.
                                    </td>
                                </tr>
                            ) : (
                                filteredVendas.map((v) => (
                                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6 text-white/60 group-hover:text-white font-mono text-xs">#{String(v.id).slice(-8)}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold font-sans">{v.passageiro}</span>
                                                <span className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Identificado</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-sans">
                                            <div className="flex items-center gap-2 text-white/70">
                                                <Ticket className="w-4 h-4 text-blue-400" />
                                                {v.empresa_parceira}
                                            </div>
                                            <div className="text-[11px] text-white/30 mt-1 pl-6">{v.destino}</div>
                                        </td>
                                        <td className="px-8 py-6 text-white/40 group-hover:text-white/60">{new Date(v.created_at).toLocaleString('pt-BR')}</td>
                                        <td className="px-8 py-6 text-right font-bold text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor)}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-white/50 uppercase font-black tracking-tighter shadow-inner">
                                                    {v.forma_pagamento}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-emerald-400 font-sans text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 w-fit">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                CONCLUÍDO
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <button className="p-2 hover:bg-white/10 rounded-lg text-white/20 hover:text-white transition-all">
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

            <div className="flex items-center justify-between text-white/40 px-4">
                <span className="text-xs">Mostrando {filteredVendas.length} de {vendas.length} registros</span>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white/5 rounded-xl text-xs hover:bg-white/10 disabled:opacity-30">Anterior</button>
                    <button className="px-4 py-2 bg-white/5 rounded-xl text-xs hover:bg-white/10 disabled:opacity-30">Próxima</button>
                </div>
            </div>

        </div>
    )
}
