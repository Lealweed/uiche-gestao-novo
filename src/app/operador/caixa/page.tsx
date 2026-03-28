'use client'

import React, { useState } from 'react'
import { WalletCards, ArrowUpCircle, ArrowDownCircle, Banknote, History, PlusCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function CaixaPDVPage() {
    const [movimentos, setMovimentos] = useState([
        { type: 'suprimento', user: 'Admin', reason: 'Fundo de troco inicial', value: 150.00, time: '28/03/2026 08:00' },
        { type: 'sangria', user: 'Operador', reason: 'Retirada para depósito', value: 200.00, time: '27/03/2026 17:30' },
    ])

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#222834]">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Fluxo de Caixa PDV</h2>
                    <p className="text-slate-500 mt-1 font-medium">Gestão de suprimentos, retiradas e conciliação física.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 shadow-emerald-500/10">
                        <ArrowUpCircle className="w-5 h-5" />
                        Suprimento
                    </button>
                    <button className="px-6 py-3 bg-[#1A1F2E] hover:bg-[#222834] text-rose-500 border border-rose-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                        <ArrowDownCircle className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
                        Nova Sangria
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-2xl border border-[#222834] bg-[#151923] shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform">
                        <Banknote className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-bold">Saldo Físico (Espécie)</span>
                        <div className="text-4xl font-bold text-emerald-500 font-mono tracking-tighter">R$ 450,00</div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">
                            Montante disponível em gaveta para troco e sangrias.
                        </p>
                    </div>
                </div>

                <div className="p-8 rounded-2xl border border-[#222834] bg-[#151923] shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform">
                        <TrendingUp className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-bold">Vendas Digitais (Não Físico)</span>
                        <div className="text-4xl font-bold text-blue-400 font-mono tracking-tighter">R$ 1.250,00</div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">
                            Total acumulado via PIX e Cartões de Crédito/Débito.
                        </p>
                    </div>
                </div>

                <div className="p-8 rounded-2xl border border-[#222834] border-dashed bg-[#0B0E14] flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-[#151923] transition-all">
                    <div className="p-4 rounded-full bg-[#1A1F2E] mb-4 group-hover:scale-110 transition-transform border border-[#222834]">
                        <PlusCircle className="w-8 h-8 text-slate-600 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-500 group-hover:text-white transition-colors">Abrir Novo Turno</h4>
                    <p className="text-[10px] text-slate-700 mt-2 max-w-[150px] font-bold uppercase tracking-wider">Reiniciar Ciclo PDV</p>
                </div>
            </div>

            {/* Histórico de Movimentações */}
            <div className="rounded-2xl border border-[#222834] bg-[#151923] overflow-hidden shadow-2xl">
                <div className="px-8 py-6 border-b border-[#222834] flex items-center justify-between bg-[#1A1F2E]/30">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-amber-500" />
                        <h3 className="font-semibold text-white">Log de Movimentações Recentes</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0B0E14] text-slate-500 text-[10px] uppercase font-bold tracking-[0.15em]">
                                <th className="px-8 py-4">Data/Hora</th>
                                <th className="px-8 py-4">Tipo</th>
                                <th className="px-8 py-4">Descrição</th>
                                <th className="px-8 py-4 text-right">Valor</th>
                                <th className="px-8 py-4 text-center">Operador</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222834] font-mono text-sm">
                            {movimentos.map((m, i) => (
                                <tr key={i} className="hover:bg-[#1A1F2E]/30 transition-colors group">
                                    <td className="px-8 py-5 text-slate-500 group-hover:text-slate-300">{m.time}</td>
                                    <td className="px-8 py-5">
                                        <div className={cn(
                                            "px-2 py-1 rounded-md text-[9px] font-black uppercase text-center inline-block tracking-wider",
                                            m.type === 'suprimento' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                        )}>
                                            {m.type}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-slate-400 italic">"{m.reason}"</td>
                                    <td className={cn(
                                        "px-8 py-5 text-right font-bold tracking-tight",
                                        m.type === 'suprimento' ? 'text-emerald-500' : 'text-rose-500'
                                    )}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.value)}
                                    </td>
                                    <td className="px-8 py-5 text-center text-slate-600 font-sans font-bold text-[10px] uppercase tracking-widest">{m.user}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alerta de Protocolo */}
            <div className="p-6 rounded-2xl bg-[#0B0E14] border border-amber-500/20 flex gap-5 items-start shadow-inner">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                    <h5 className="text-sm font-bold text-amber-500 mb-1 uppercase tracking-wider">Protocolo de Segurança Financeira</h5>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-3xl font-medium">
                        Todas as sangrias e suprimentos são registrados com timestamp e ID do operador. O sistema gera reconciliação automática no fechamento. Divergências físicas exigem aprovação manual da supervisão.
                    </p>
                </div>
            </div>
        </div>
    )
}
