'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2, User, MapPin, CircleDollarSign, CreditCard,
  ReceiptText, CheckCircle2, Ticket, Loader2, Smartphone, Banknote,
  AlertTriangle, X, ArrowRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Company {
  id: string
  name: string
  commission_rate: number
}

interface Shift {
  id: string
  booth_id: string
  booths?: { code: string; name: string }
}

const INPUT_CLS = 'w-full pl-12 pr-4 py-3.5 bg-[#0B0E14] border border-[#222834] rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all'
const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX', icon: Smartphone },
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'debit', label: 'Débito', icon: CreditCard },
  { id: 'credit', label: 'Crédito', icon: CreditCard },
]

export default function NovaVendaPage() {
  const supabase = createClient()

  // Auth
  const [userId, setUserId] = useState<string | null>(null)

  // Dados do banco
  const [companies, setCompanies] = useState<Company[]>([])
  const [openShift, setOpenShift] = useState<Shift | null>(null)
  const [initLoading, setInitLoading] = useState(true)

  // Form
  const [companyId, setCompanyId] = useState('')
  const [passageiro, setPassageiro] = useState('')
  const [destino, setDestino] = useState('')
  const [valor, setValor] = useState('')
  const [taxaEmbarque, setTaxaEmbarque] = useState('')
  const [pagamento, setPagamento] = useState('pix')
  const [loading, setLoading] = useState(false)

  // Feedback
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadInitialData = useCallback(async (uid: string) => {
    setInitLoading(true)

    const [{ data: companiesData }, { data: shift }] = await Promise.all([
      supabase.from('companies').select('id, name, commission_rate').eq('active', true).order('name'),
      supabase
        .from('shifts')
        .select('id, booth_id, booths(code, name)')
        .eq('operator_id', uid)
        .eq('status', 'open')
        .maybeSingle(),
    ])

    setCompanies(companiesData ?? [])
    setOpenShift(shift as Shift | null)
    if (companiesData && companiesData.length > 0) setCompanyId(companiesData[0].id)
    setInitLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadInitialData(user.id)
      }
    })
  }, [loadInitialData, supabase.auth])

  const selectedCompany = companies.find(c => c.id === companyId)
  const numericValor = parseFloat(valor.replace(',', '.')) || 0
  const numericTaxa = parseFloat(taxaEmbarque.replace(',', '.')) || 0
  const totalBilhete = numericValor + numericTaxa
  const commissionAmount = selectedCompany
    ? (numericValor * selectedCompany.commission_rate) / 100
    : 0

  const valorFormatado = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  function resetForm() {
    setPassageiro('')
    setDestino('')
    setValor('')
    setTaxaEmbarque('')
    setPagamento('pix')
    if (companies.length > 0) setCompanyId(companies[0].id)
  }

  const handleConfirmarVenda = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!openShift) return setError('Nenhum turno aberto. Abra o caixa primeiro.')
    if (!companyId) return setError('Selecione a viação.')
    if (!passageiro.trim()) return setError('Informe o nome do passageiro.')
    if (!destino.trim()) return setError('Informe o destino.')
    if (isNaN(numericValor) || numericValor <= 0) return setError('Valor inválido.')

    setLoading(true)

    const { error: dbError } = await supabase.from('transactions').insert({
      shift_id: openShift.id,
      booth_id: openShift.booth_id,
      company_id: companyId,
      operator_id: userId,
      amount: numericValor,
      payment_method: pagamento,
      commission_amount: commissionAmount,
      note: JSON.stringify({
        passageiro: passageiro.trim().toUpperCase(),
        destino: destino.trim(),
        taxa_embarque: numericTaxa,
        total_bilhete: totalBilhete,
      }),
    })

    setLoading(false)

    if (dbError) {
      setError('Erro ao registrar: ' + dbError.message)
      return
    }

    setSuccess(`Venda registrada! Comissão: ${valorFormatado(commissionAmount)}`)
    resetForm()
    setTimeout(() => setSuccess(''), 5000)
  }

  // ── BLOQUEIO: caixa fechado ──
  if (initLoading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" /> Verificando turno...
      </div>
    )
  }

  if (!openShift) {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Caixa Fechado</h2>
          <p className="text-slate-400 max-w-sm">
            Você precisa abrir um turno antes de registrar vendas.
            Acesse o <strong className="text-white">Resumo do Turno</strong> e clique em <strong className="text-emerald-400">Abrir Turno</strong>.
          </p>
        </div>
        <a
          href="/operador"
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all"
        >
          Ir para Controle de Turno <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Nova Passagem</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Turno ativo · Guichê {openShift.booths?.code} — {openShift.booths?.name}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Caixa Aberto
        </span>
      </div>

      <form onSubmit={handleConfirmarVenda} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* FORMULÁRIO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#151923] border border-[#222834] rounded-2xl p-8 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Dados da Operação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Viação – busca do banco */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">Viação Parceira</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-amber-500 transition-colors">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <select
                    className={INPUT_CLS + ' appearance-none cursor-pointer'}
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Selecione a viação...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.commission_rate}% comissão)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Passageiro */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">Nome do Passageiro</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-amber-500 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nome completo do passageiro"
                    className={INPUT_CLS + ' uppercase'}
                    value={passageiro}
                    onChange={e => setPassageiro(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>

              {/* Destino */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Cidade Destino</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-amber-500 transition-colors">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Marabá - PA"
                    className={INPUT_CLS}
                    value={destino}
                    onChange={e => setDestino(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Valor da Passagem (R$)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-amber-500 transition-colors">
                    <CircleDollarSign className="h-5 w-5" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    className={INPUT_CLS + ' font-mono'}
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Taxa de Embarque */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">
                  Taxa de Embarque (R$) <span className="text-slate-600 font-normal">— opcional</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-amber-500 transition-colors">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className={INPUT_CLS + ' font-mono'}
                    value={taxaEmbarque}
                    onChange={e => setTaxaEmbarque(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="bg-[#151923] border border-[#222834] rounded-2xl p-8 shadow-xl">
            <label className="text-sm font-medium text-slate-300 mb-4 block">Forma de Pagamento</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PAYMENT_METHODS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPagamento(f.id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-2',
                    pagamento === f.id
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/5'
                      : 'bg-[#0B0E14] border-[#222834] text-slate-500 hover:border-slate-600 hover:text-slate-300'
                  )}
                >
                  <f.icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RESUMO */}
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24">
          <div className="bg-[#151923]/50 border border-[#222834] rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="p-6 border-b border-[#222834] bg-[#1A1F2E]/50">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <ReceiptText className="w-5 h-5 text-amber-500" /> Resumo da Emissão
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Viação</span>
                  <span className="text-white font-semibold text-right max-w-[160px] truncate">
                    {selectedCompany?.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Destino</span>
                  <span className="text-white font-semibold">{destino || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Pagamento</span>
                  <span className="text-white font-semibold capitalize">{pagamento}</span>
                </div>
              </div>

              <div className="border-t border-[#222834] pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Passagem</span>
                  <span className="font-mono">{valorFormatado(numericValor)}</span>
                </div>
                {numericTaxa > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Taxa de embarque</span>
                    <span className="font-mono">{valorFormatado(numericTaxa)}</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-400/70">
                  <span>Comissão ({selectedCompany?.commission_rate ?? 0}%)</span>
                  <span className="font-mono">{valorFormatado(commissionAmount)}</span>
                </div>
              </div>

              <div className="p-5 bg-[#0B0E14] border border-[#222834] rounded-xl text-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] block mb-2">
                  Total do Bilhete
                </span>
                <div className="text-3xl font-bold text-amber-500 tracking-tight font-mono">
                  {valorFormatado(totalBilhete)}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                  <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs font-medium">{error}</p>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-400 text-xs font-medium">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98]',
                  loading
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/10'
                )}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {loading ? 'REGISTRANDO...' : 'FINALIZAR VENDA'}
              </button>

              <p className="text-[10px] text-slate-500 text-center px-4 leading-relaxed">
                A comissão será calculada automaticamente e vinculada ao turno atual.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
