'use client'

import React, { useState } from 'react'
import { Clock, Calendar, ArrowUpCircle, ArrowDownCircle, Coffee, History, MapPin, Loader2 } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function PontoDigitalPage() {
    const [status, setStatus] = useState('offline') // 'offline', 'working', 'break'
    const [loading, setLoading] = useState(false)
    const [records, setRecords] = useState([
        { date: '28/03/2026', entrada: '08:00', pausa: '12:00', retorno: '13:00', saida: '17:00', total: '08:00' },
        { date: '27/03/2026', entrada: '08:05', pausa: '12:10', retorno: '13:05', saida: '17:15', total: '08:10' },
    ])

    const handleAction = (type: string) => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            if (type === 'entrada') setStatus('working')
            if (type === 'pausa') setStatus('break')
            if (type === 'retorno') setStatus('working')
            if (type === 'saida') setStatus('offline')
        }, 800)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="border-b border-[#222834] pb-6">
                <h2 className="text-3xl font-bold text-white tracking-tight">Ponto Digital</h2>
                <p className="text-slate-500 mt-1 font-medium">Controle de jornada e registros de ponto biométrico/digital.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Registro de Ponto */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-2xl border border-[#222834] bg-[#151923] p-10 shadow-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={cn(
                                "p-8 rounded-full border-2 mb-8 transition-all duration-500",
                                status === 'working' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.1)]' :
                                status === 'break' ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_40px_rgba(245,195,71,0.1)]' :
                                'border-[#222834] bg-[#0B0E14] text-slate-700'
                            )}>
                                <Clock className="w-16 h-16 animate-pulse" />
                            </div>
                            
                            <div className="space-y-1 mb-10">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Status do Terminal</h3>
                                <p className={cn(
                                    "text-xl font-bold tracking-tight",
                                    status === 'working' ? 'text-emerald-500' : status === 'break' ? 'text-amber-500' : 'text-slate-400'
                                )}>
                                    {status === 'offline' ? 'FORA DE SERVIÇO' : status === 'working' ? 'JORNADA ATIVA' : 'INTERVALO REFEIÇÃO'}
                                </p>
                                <p className="text-5xl font-mono font-bold text-white tracking-tight pt-4">14:52:30</p>
                            </div>

                            <div className="w-full space-y-4">
                                {status === 'offline' && (
                                    <button 
                                        onClick={() => handleAction('entrada')}
                                        disabled={loading}
                                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-emerald-500/10 h-16"
                                    >
                                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowUpCircle className="w-6 h-6" />}
                                        Registrar Entrada
                                    </button>
                                )}
                                
                                {status === 'working' && (
                                    <>
                                        <button 
                                            onClick={() => handleAction('pausa')}
                                            disabled={loading}
                                            className="w-full py-5 bg-[#0B0E14] hover:bg-[#1A2333] text-amber-500 border border-[#222834] rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] h-16 shadow-lg shadow-black/40"
                                        >
                                            <Coffee className="w-6 h-6" />
                                            Iniciar Pausa
                                        </button>
                                        <button 
                                            onClick={() => handleAction('saida')}
                                            disabled={loading}
                                            className="w-full py-5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] h-16"
                                        >
                                            <ArrowDownCircle className="w-6 h-6" />
                                            Encerrar Turno
                                        </button>
                                    </>
                                )}

                                {status === 'break' && (
                                    <button 
                                        onClick={() => handleAction('retorno')}
                                        disabled={loading}
                                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-emerald-500/10 h-16"
                                    >
                                        <ArrowUpCircle className="w-6 h-6" />
                                        Retornar da Pausa
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-[#222834] bg-[#0B0E14] shadow-inner">
                        <div className="flex items-center gap-3 mb-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-amber-500/50" />
                            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Ponto Georreferenciado</span>
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Terminal Matriz • Guichê 04 • Estação Operador</p>
                    </div>
                </div>

                {/* Histórico de Pontos */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-[#222834] bg-[#151923] overflow-hidden shadow-2xl">
                        <div className="px-8 py-6 border-b border-[#222834] flex items-center justify-between bg-[#1A1F2E]/30">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-white">Extrato de Jornada Recente</h3>
                            </div>
                            <button className="p-2.5 rounded-xl bg-[#0B0E14] hover:bg-[#1A2333] text-slate-500 hover:text-white transition-all border border-[#222834]">
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0B0E14] text-slate-500 text-[10px] uppercase font-bold tracking-[0.15em]">
                                        <th className="px-8 py-4">Data</th>
                                        <th className="px-8 py-4 text-center">Entrada</th>
                                        <th className="px-8 py-4 text-center">Pausas</th>
                                        <th className="px-8 py-4 text-center">Saída</th>
                                        <th className="px-8 py-4 text-right">Carga Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222834] font-mono text-sm">
                                    {records.map((r, i) => (
                                        <tr key={i} className="hover:bg-[#1A1F2E]/30 transition-colors group">
                                            <td className="px-8 py-5 text-slate-400 group-hover:text-slate-200 font-sans font-bold">{r.date}</td>
                                            <td className="px-8 py-5 text-center text-emerald-500/80 font-bold">{r.entrada}</td>
                                            <td className="px-8 py-5 text-center text-slate-500 italic text-xs">{r.pausa} - {r.retorno}</td>
                                            <td className="px-8 py-5 text-center text-rose-500/80 font-bold">{r.saida}</td>
                                            <td className="px-8 py-5 text-right font-bold text-white tracking-tight">{r.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-8 rounded-2xl border border-[#222834] bg-[#151923] shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] block mb-2 font-bold">Acumulado Mensal</span>
                            <span className="text-3xl font-bold text-white tracking-tighter">152:45 <span className="text-xs text-slate-600 font-normal">HORAS</span></span>
                        </div>
                        <div className="p-8 rounded-2xl border border-[#222834] bg-[#151923] shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] block mb-2 font-bold">Resíduo / Débito</span>
                            <span className="text-3xl font-bold text-rose-500 tracking-tighter">02:30 <span className="text-xs text-rose-900 font-normal uppercase">Divergência</span></span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
