'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, Plus, Pencil, PowerOff, Power, Loader2,
  CheckCircle2, AlertCircle, X, Percent, Save
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Company {
  id: string
  name: string
  commission_rate: number
  active: boolean
  created_at: string
}

interface Toast {
  type: 'success' | 'error'
  message: string
}

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={cn(
      'fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-in slide-in-from-top-4 duration-300',
      toast.type === 'success'
        ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
        : 'bg-red-950/90 border-red-500/30 text-red-300'
    )}>
      {toast.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

const INPUT_CLS = 'w-full px-4 py-2.5 bg-[#0B0E14] border border-[#222834] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm'
const LABEL_CLS = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

export default function ViacoesPage() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [commissionRate, setCommissionRate] = useState('15')

  const showToast = (type: Toast['type'], message: string) => setToast({ type, message })

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    if (error) showToast('error', 'Erro ao carregar viações: ' + error.message)
    else setCompanies(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  function openCreate() {
    setEditingId(null)
    setName('')
    setCommissionRate('15')
    setShowForm(true)
  }

  function openEdit(c: Company) {
    setEditingId(c.id)
    setName(c.name)
    setCommissionRate(String(c.commission_rate))
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setCommissionRate('15')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return showToast('error', 'Nome da viação é obrigatório.')
    const rate = parseFloat(commissionRate)
    if (isNaN(rate) || rate < 0 || rate > 100) return showToast('error', 'Comissão deve ser entre 0 e 100.')

    setSaving(true)
    if (editingId) {
      const { error } = await supabase
        .from('companies')
        .update({ name: name.trim(), commission_rate: rate })
        .eq('id', editingId)
      if (error) showToast('error', 'Erro ao atualizar: ' + error.message)
      else { showToast('success', 'Viação atualizada com sucesso!'); cancelForm(); fetchCompanies() }
    } else {
      const { error } = await supabase
        .from('companies')
        .insert({ name: name.trim(), commission_rate: rate, active: true })
      if (error) {
        const msg = error.code === '23505'
          ? 'Já existe uma viação com esse nome.'
          : 'Erro ao cadastrar: ' + error.message
        showToast('error', msg)
      } else { showToast('success', 'Viação cadastrada com sucesso!'); cancelForm(); fetchCompanies() }
    }
    setSaving(false)
  }

  async function toggleActive(c: Company) {
    const { error } = await supabase
      .from('companies')
      .update({ active: !c.active })
      .eq('id', c.id)
    if (error) showToast('error', 'Erro ao alterar status: ' + error.message)
    else {
      showToast('success', `Viação ${!c.active ? 'ativada' : 'desativada'}.`)
      fetchCompanies()
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Viações Parceiras</h1>
            <p className="text-slate-500 text-sm">Gerencie as empresas e suas comissões.</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Nova Viação
        </button>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="bg-[#151923] border border-blue-500/20 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-3 duration-300">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {editingId ? 'Editar Viação' : 'Nova Viação'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className={LABEL_CLS}>Nome da Viação</label>
              <input
                type="text"
                placeholder="Ex: Viação Ouro e Prata"
                className={INPUT_CLS}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Comissão (%)</label>
              <div className="relative">
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="15"
                  className={cn(INPUT_CLS, 'pr-10 font-mono')}
                  value={commissionRate}
                  onChange={e => setCommissionRate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="md:col-span-3 flex gap-3 justify-end pt-1">
              <button type="button" onClick={cancelForm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-[#222834] hover:border-slate-600 hover:text-slate-200 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#151923] border border-[#1A2333] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1A2333] flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {companies.length} viações cadastradas
          </span>
          <span className="text-xs text-slate-600">
            {companies.filter(c => c.active).length} ativas
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma viação cadastrada ainda.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B0E14]/60 border-b border-[#1A2333]">
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Viação</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Comissão</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2333]">
              {companies.map(c => (
                <tr key={c.id} className={cn('hover:bg-white/[0.02] transition-colors', !c.active && 'opacity-50')}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{c.name}</div>
                        <div className="text-[10px] text-slate-600 font-mono">{c.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-400 font-mono">
                      {c.commission_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      'text-[10px] font-bold px-2.5 py-1 rounded-full',
                      c.active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    )}>
                      {c.active ? '● Ativa' : '○ Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleActive(c)}
                        className={cn(
                          'p-1.5 rounded-lg transition-all',
                          c.active
                            ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                            : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                        )}
                        title={c.active ? 'Desativar' : 'Reativar'}>
                        {c.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
