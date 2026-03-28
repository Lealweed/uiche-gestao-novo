'use client'

import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Wallet, 
  Monitor, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  change?: string
  isPositive?: boolean
  icon: React.ElementType
  color: 'blue' | 'emerald' | 'rose' | 'amber'
}

function StatCard({ label, value, change, isPositive, icon: Icon, color }: StatCardProps) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/10'
  }

  return (
    <div className={cn(
      "p-5 rounded-xl border bg-[#151923] shadow-lg transition-all hover:-translate-y-1 hover:border-slate-700/50 duration-300",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-lg border bg-[#0B0E14]/40">
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full",
            isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
      </div>
    </div>
  )
}

export default function GerenciaDashboard() {
  const recentActivities = [
    { id: '1', terminal: 'G01 - Terminal Principal', operator: 'L. Mendonça', time: '14:23', type: 'Venda', amount: 'R$ 145,00', status: 'Sucesso' },
    { id: '2', terminal: 'G02 - Terminal Oeste', operator: 'K. Silva', time: '14:18', type: 'Sangria', amount: 'R$ 500,00', status: 'Aguardando' },
    { id: '3', terminal: 'G01 - Terminal Principal', operator: 'L. Mendonça', time: '14:15', type: 'Venda', amount: 'R$ 89,90', status: 'Sucesso' },
    { id: '4', terminal: 'G03 - Terminal Central', operator: 'D. Rocha', time: '14:02', type: 'Login', amount: '-', status: 'Logado' },
    { id: '5', terminal: 'G02 - Terminal Oeste', operator: 'K. Silva', time: '13:45', type: 'Venda', amount: 'R$ 210,00', status: 'Sucesso' },
  ]

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-slate-400 text-sm max-w-xl">Bem-vindo ao centro de comando. Aqui você acompanha a saúde financeira e operacional de todos os guichês em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 group">
            Relatório Consolidado
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-2">
        <StatCard 
          label="Faturamento Total" 
          value="R$ 12.450,80" 
          change="+12.5%" 
          isPositive={true} 
          icon={TrendingUp} 
          color="blue"
        />
        <StatCard 
          label="Terminais Ativos" 
          value="03 / 05" 
          icon={Monitor} 
          color="emerald"
        />
        <StatCard 
          label="Ticket Médio" 
          value="R$ 142,30" 
          change="-2.1%" 
          isPositive={false} 
          icon={Wallet} 
          color="amber"
        />
        <StatCard 
          label="Passagens Vendidas" 
          value="87" 
          change="+4" 
          isPositive={true} 
          icon={CreditCard} 
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Activity Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Monitoramento em Tempo Real
            </h3>
            <button className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">Histórico Completo</button>
          </div>
          
          <div className="bg-[#151923] border border-[#1A2333] rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B0E14]/70 border-b border-[#1A2333]">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terminal</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operador</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Hora</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2333]">
                {recentActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                        <span className="text-sm font-semibold text-slate-200">{activity.terminal}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">{activity.operator}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-mono text-slate-500">{activity.time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tight",
                        activity.type === 'Sangria' ? "bg-rose-600/10 text-rose-500 border border-rose-600/20" : "bg-blue-600/10 text-blue-500 border border-blue-600/20"
                      )}>
                        {activity.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-200">{activity.amount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        activity.status === 'Sucesso' ? "text-emerald-500 bg-emerald-500/10" : 
                        activity.status === 'Logado' ? "text-blue-400 bg-blue-500/10" : "text-amber-500 bg-amber-500/10"
                      )}>
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Info Panels */}
        <div className="space-y-6">
          <div className="p-6 bg-[#151923] border border-[#1A2333] rounded-xl shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Presença e Turnos
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#0B0E14]/50 rounded-lg border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-400">LM</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-none">L. Mendonça</span>
                    <span className="text-[9px] text-slate-500 uppercase mt-1">Terminal Principal</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500">Logado</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0B0E14]/50 rounded-lg border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-blue-400">KS</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-none">K. Silva</span>
                    <span className="text-[9px] text-slate-500 uppercase mt-1">Terminal Oeste</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-amber-500 italic">Pausa</span>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 py-2 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 text-blue-400 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest">
              Gerenciar Equipe
            </button>
          </div>

          <div className="p-6 bg-gradient-to-br from-blue-600/20 to-indigo-600/5 border border-blue-500/30 rounded-xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <TrendingUp className="w-12 h-12 text-blue-400" />
            </div>
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Status Projeção</h4>
            <p className="text-sm text-slate-300 font-medium leading-relaxed mb-4">
              O faturamento atual está <span className="text-emerald-400 font-bold">15% acima</span> da meta projetada para hoje.
            </p>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[65%] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
