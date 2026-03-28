'use client'

import React, { useState } from 'react'
import { Clock, Calendar, ArrowUpCircle, ArrowDownCircle, Coffee, History, MapPin, Loader2 } from 'lucide-react'

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
            <div>
                <h2 className="text-3xl font-bold text-white/90">Ponto Digital</h2>
                <p className="text-white/40 mt-1">Gestão de jornada e controle de horários.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Registro de Ponto */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={`p-6 rounded-full border-4 mb-6 transition-all duration-500 ${
                                status === 'working' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 scale-110 shadow-[0_0_30px_rgba(16,185,129,0.2)]' :
                                status === 'break' ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' :
                                'border-white/5 bg-white/5 text-white/20'
                            }`}>
                                <Clock className="w-16 h-16" />
                            </div>
                            
                            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                                {status === 'offline' ? 'Fora de Serviço' : status === 'working' ? 'Em Jornada' : 'Em Intervalo'}
                            </h3>
                            <p className="text-4xl font-mono font-bold text-white/90 mb-8 tabular-nums">14:52:30</p>

                            <div className="w-full space-y-3">
                                {status === 'offline' && (
                                    <button 
                                        onClick={() => handleAction('entrada')}
                                        disabled={loading}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpCircle className="w-5 h-5" />}
                                        Bater Entrada
                                    </button>
                                )}
                                
                                {status === 'working' && (
                                    <>
                                        <button 
                                            onClick={() => handleAction('pausa')}
                                            disabled={loading}
                                            className="w-full py-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Coffee className="w-5 h-5 text-amber-500" />
                                            Iniciar Pausa
                                        </button>
                                        <button 
                                            onClick={() => handleAction('saida')}
                                            disabled={loading}
                                            className="w-full py-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/20 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <ArrowDownCircle className="w-5 h-5" />
                                            Registrar Saída
                                        </button>
                                    </>
                                )}

                                {status === 'break' && (
                                    <button 
                                        onClick={() => handleAction('retorno')}
                                        disabled={loading}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <ArrowUpCircle className="w-5 h-5" />
                                        Retornar da Pausa
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Background decorativo */}
                        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    </div>

                    <div className="p-6 rounded-3xl border border-white/10 bg-black/20">
                        <div className="flex items-center gap-3 mb-4 text-white/50">
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs uppercase font-bold tracking-widest">Localização Atual</span>
                        </div>
                        <p className="text-sm text-white/80">Guichê Central - Terminal Rodoviário</p>
                    </div>
                </div>

                {/* Histórico de Pontos */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden shadow-xl">
                        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-blue-400" />
                                <h3 className="font-semibold text-white/80">Logs Recentes</h3>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-all">
                                    <Calendar className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.01] text-white/30 text-[10px] uppercase tracking-widest">
                                        <th className="px-8 py-4 font-medium">Data</th>
                                        <th className="px-8 py-4 font-medium text-center">Entrada</th>
                                        <th className="px-8 py-4 font-medium text-center">Pausa</th>
                                        <th className="px-8 py-4 font-medium text-center">Saída</th>
                                        <th className="px-8 py-4 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-sm leading-relaxed">
                                    {records.map((r, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-5 text-white/70 group-hover:text-white font-sans">{r.date}</td>
                                            <td className="px-8 py-5 text-center text-emerald-400/80">{r.entrada}</td>
                                            <td className="px-8 py-5 text-center text-amber-400/60">{r.pausa} - {r.retorno}</td>
                                            <td className="px-8 py-5 text-center text-rose-400/80">{r.saida}</td>
                                            <td className="px-8 py-5 text-right font-bold text-white">{r.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl border border-white/10 bg-white/5">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">Horas Mensais</span>
                            <span className="text-2xl font-bold text-white">152:45</span>
                        </div>
                        <div className="p-6 rounded-3xl border border-white/10 bg-white/5">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">Divergências</span>
                            <span className="text-2xl font-bold text-rose-400">02:30</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
