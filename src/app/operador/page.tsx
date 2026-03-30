'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Banknote, Ticket, TrendingUp, Clock, History,
  PlusCircle, ArrowUpCircle, ArrowDownCircle, ChevronRight,
  CheckCircle2, Loader2, Monitor, AlertTriangle, LogIn, LogOut as LogOutIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Shift {
  id: string
  status: 'open' | 'closed'
  booth_id: string
  opened_at: string
  booths?: { code: string; name: string }
}

interface Transaction {
  id: string
  amount: number
  payment_method: string
  companies?: { name: string }
  sold_at: string
}

interface OperatorBooth {
  booth_id: string
  booths: { id: string; code: string; name: string }
}

export default function OperadorDashboard() {
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [openShift, setOpenShift] = useState<Shift | null>(null)
  const [operatorBooth, setOperatorBooth] = useState<OperatorBooth | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dashboardData, setDashboardData] = useState({ total: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const [shiftLoading, setShiftLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const showFeedback = (type: string, message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000)
  }

  const loadAll = useCallback(async (uid: string) => {
    setLoading(true)
    // 1. Guichê vinculado
    const { data: ob } = await supabase
      .from('operator_booths')
      .select('booth_id, booths(id, code, name)')
      .eq('operator_id', uid)
      .maybeSingle()
    setOperatorBooth(ob as OperatorBooth | null)

    // 2. Turno aberto
    const { data: shift } = await supabase
      .from('shifts')
      .select('id, status, booth_id, opened_at, booths(code, name)')
      .eq('operator_id', uid)
      .eq('status', 'open')
      .maybeSingle()
    setOpenShift(shift as Shift | null)

    // 3. Transações do turno aberto
    if (shift?.id) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('id, amount, payment_method, companies(name), sold_at')
        .eq('shift_id', shift.id)
        .order('sold_at', { ascending: false })
        .limit(10)
      const list = (txs ?? []) as unknown as Transaction[]
      const total = list.reduce((s, t) => s + (Number(t.amount) || 0), 0)
      setTransactions(list)
      setDashboardData({ total, count: list.length })
    } else {
      setTransactions([])
      setDashboardData({ total: 0, count: 0 })
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadAll(user.id)
      }
    })
  }, [loadAll, supabase.auth])

  async function handleAbrirTurno() {
    if (!userId || !operatorBooth) return
    setShiftLoading(true)
    const { error } = await supabase.from('shifts').insert({
      operator_id: userId,
      booth_id: operatorBooth.booth_id,
      status: 'open',
      opened_at: new Date().toISOString(),
    })
    if (error) showFeedback('error', 'Erro ao abrir turno: ' + error.message)
    else { showFeedback('success', 'Turno aberto com sucesso!'); loadAll(userId) }
    setShiftLoading(false)
  }

  async function handleEncerrarTurno() {
    if (!openShift || !userId) return
    if (!confirm('Deseja encerrar o turno atual? Esta ação não pode ser desfeita.')) return
    setShiftLoading(true)
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', openShift.id)
    if (error) showFeedback('error', 'Erro ao encerrar turno: ' + error.message)
    else { showFeedback('success', 'Turno encerrado.'); loadAll(userId) }
    setShiftLoading(false)
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const shiftDuration = () => {
    if (!openShift?.opened_at) return '--:--'
    const diff = Math.floor((Date.now() - new Date(openShift.opened_at).getTime()) / 60000)
    return `${Math.floor(diff / 60)}h ${diff % 60}min`
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── FEEDBACK GLOBAL ── */}
      {feedback.message && (
        <div className={cn(
          'fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-in slide-in-from-top-4 duration-300',
          feedback.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950/90 border-red-500/30 text-red-300'
        )}>
          {feedback.type === 'success'
            ? <CheckCircle2 className="w-4 h-4" />
            : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222834] pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Resumo da Operação</h2>
          <p className="text-slate-500 text-sm mt-1">
            {operatorBooth
              ? <>Guichê <span className="text-white font-semibold">{operatorBooth.booths.code} — {operatorBooth.booths.name}</span></>
              : <span className="text-amber-400">⚠ Nenhum guichê vinculado. Solicite ao administrador.</span>}
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border shadow-lg',
          openShift
            ? 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5'
            : 'bg-slate-800/40 border-slate-700/40'
        )}>
          <div className={cn('w-2 h-2 rounded-full', openShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600')} />
          <span className={cn('text-xs font-bold uppercase tracking-wider', openShift ? 'text-emerald-400' : 'text-slate-500')}>
            {openShift ? `Turno Ativo · ${shiftDuration()}` : 'Caixa Fechado'}
          </span>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 relative group rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl transition-all hover:border-amber-500/20 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Banknote className="w-32 h-32 text-amber-500 rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Faturamento do Turno</h3>
            </div>
            <div className="text-4xl font-bold tracking-tighter text-white mb-2 font-mono">
              {loading ? '---' : fmt(dashboardData.total)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {dashboardData.count} transações no turno
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
              {loading ? '0' : dashboardData.count}
            </div>
            <p className="text-xs text-slate-500 mt-2 uppercase tracking-tight">Vendas no Turno</p>
          </div>
        </div>

        <div className="relative group rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl transition-all hover:border-purple-500/20">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
                <Monitor className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Guichê</h3>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {operatorBooth?.booths.code ?? '---'}
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate">{operatorBooth?.booths.name ?? 'Sem vínculo'}</p>
          </div>
        </div>
      </div>

      {/* ── BODY: Histórico + Controle de Turno ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Transações do turno */}
        <div className="lg:col-span-2 rounded-2xl border border-[#222834] bg-[#151923] overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-[#222834] flex items-center justify-between bg-[#1A1F2E]/30">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Transações do Turno</h3>
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
                  <th className="px-6 py-4 text-center">Pgto</th>
                  <th className="px-6 py-4 text-right">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222834] font-mono text-sm">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="h-12 bg-[#0B0E14]/50" />
                    </tr>
                  ))
                ) : !openShift ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic">
                      Abra o caixa para ver as transações.
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic">
                      Nenhuma venda neste turno ainda.
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-[#1A1F2E]/50 transition-colors group">
                      <td className="px-6 py-4 text-slate-400">#{tx.id.slice(-6)}</td>
                      <td className="px-6 py-4 text-slate-400">{tx.companies?.name ?? '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">{fmt(tx.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 text-xs">{fmtTime(tx.sold_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controle de Turno */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#222834]">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-white">Controle de Turno</h3>
            </div>

            {!operatorBooth ? (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  Você não possui guichê vinculado. Solicite ao administrador na seção <strong>Vínculo de Equipe</strong>.
                </p>
              </div>
            ) : openShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Guichê</span>
                    <span className="text-white font-semibold">{openShift.booths?.code} — {openShift.booths?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Abertura</span>
                    <span className="text-white font-mono">{fmtTime(openShift.opened_at)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Duração</span>
                    <span className="text-emerald-400 font-semibold">{shiftDuration()}</span>
                  </div>
                </div>
                <button
                  onClick={handleEncerrarTurno}
                  disabled={shiftLoading}
                  className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {shiftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOutIcon className="w-4 h-4" />}
                  Encerrar Turno
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl text-center">
                  <div className="text-slate-500 text-sm mb-1">Guichê disponível</div>
                  <div className="text-white font-bold">{operatorBooth.booths.code} — {operatorBooth.booths.name}</div>
                </div>
                <button
                  onClick={handleAbrirTurno}
                  disabled={shiftLoading}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/15 disabled:opacity-50"
                >
                  {shiftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Abrir Turno
                </button>
              </div>
            )}
          </div>

          {/* Status do Caixa */}
          <div className="rounded-2xl border border-[#222834] bg-[#151923] p-6 shadow-xl">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 pb-3 border-b border-[#222834]">
              Status do Caixa
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B0E14] border border-[#222834]">
                <span className="text-slate-500 text-xs font-semibold">TOTAL VENDIDO</span>
                <span className="text-sm font-mono text-white">{fmt(dashboardData.total)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B0E14] border border-[#222834]">
                <span className="text-slate-500 text-xs font-semibold">TRANSAÇÕES</span>
                <span className="text-sm font-mono text-blue-400">{dashboardData.count}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-[#1A1F2E] border border-amber-500/10">
                <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">Ticket Médio</span>
                <span className="text-lg font-mono font-bold text-amber-500">
                  {dashboardData.count > 0 ? fmt(dashboardData.total / dashboardData.count) : 'R$ 0,00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
