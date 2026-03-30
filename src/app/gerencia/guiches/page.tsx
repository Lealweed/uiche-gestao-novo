'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Monitor, Plus, Pencil, PowerOff, Power, Loader2,
  CheckCircle2, AlertCircle, X, MapPin, Save, Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Booth {
  id: string
  code: string
  name: string
  location: string | null
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

export default function GuichesPage() {
  const supabase = createClient()
  const [booths, setBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [boothName, setBoothName] = useState('')
  const [location, setLocation] = useState('')

  const showToast = (type: Toast['type'], message: string) => setToast({ type, message })

  const fetchBooths = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('booths')
      .select('*')
      .order('code')
    if (error) showToast('error', 'Erro ao carregar guichês: ' + error.message)
    else setBooths(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchBooths() }, [fetchBooths])

  function openCreate() {
    setEditingId(null)
    setCode(''); setBoothName(''); setLocation('')
    setShowForm(true)
  }

  function openEdit(b: Booth) {
    setEditingId(b.id)
    setCode(b.code)
    setBoothName(b.name)
    setLocation(b.location ?? '')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setCode(''); setBoothName(''); setLocation('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !boothName.trim()) return showToast('error', 'Código e nome são obrigatórios.')

    setSaving(true)
    const payload = {
      code: code.trim().toUpperCase(),
      name: boothName.trim(),
      location: location.trim() || null,
    }

    if (editingId) {
      const { error } = await supabase.from('booths').update(payload).eq('id', editingId)
      if (error) showToast('error', 'Erro ao atualizar: ' + error.message)
      else { showToast('success', 'Guichê atualizado!'); cancelForm(); fetchBooths() }
    } else {
      const { error } = await supabase.from('booths').insert({ ...payload, active: true })
      if (error) {
        const msg = error.code === '23505'
          ? `Código "${payload.code}" já está em uso.`
          : 'Erro ao criar guichê: ' + error.message
        showToast('error', msg)
      } else { showToast('success', 'Guichê criado com sucesso!'); cancelForm(); fetchBooths() }
    }
    setSaving(false)
  }

  async function toggleActive(b: Booth) {
    const { error } = await supabase.from('booths').update({ active: !b.active }).eq('id', b.id)
    if (error) showToast('error', 'Erro ao alterar status: ' + error.message)
    else { showToast('success', `Guichê ${!b.active ? 'ativado' : 'desativado'}.`); fetchBooths() }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Guichês</h1>
            <p className="text-slate-500 text-sm">Terminais de venda cadastrados no sistema.</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> Novo Guichê
        </button>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="bg-[#151923] border border-emerald-500/20 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-3 duration-300">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {editingId ? 'Editar Guichê' : 'Novo Guichê'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className={LABEL_CLS}>Código</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  placeholder="G01"
                  maxLength={6}
                  className={cn(INPUT_CLS, 'pl-9 font-mono uppercase')}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Nome do Guichê</label>
              <input
                type="text"
                placeholder="Ex: Terminal Central"
                className={INPUT_CLS}
                value={boothName}
                onChange={e => setBoothName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Localização</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  placeholder="Ex: Sala 2 - Andar térreo"
                  className={cn(INPUT_CLS, 'pl-9')}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="md:col-span-3 flex gap-3 justify-end pt-1">
              <button type="button" onClick={cancelForm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-[#222834] hover:border-slate-600 hover:text-slate-200 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-semibold transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando guichês...
        </div>
      ) : booths.length === 0 ? (
        <div className="text-center py-16 text-slate-600 bg-[#151923] border border-[#1A2333] rounded-2xl">
          <Monitor className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum guichê cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {booths.map(b => (
            <div key={b.id} className={cn(
              'bg-[#151923] border rounded-2xl p-5 transition-all hover:-translate-y-0.5 duration-200 shadow-lg',
              b.active ? 'border-[#1A2333] hover:border-emerald-500/20' : 'border-[#1A2333] opacity-50'
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center border',
                  b.active
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-600'
                )}>
                  <Monitor className="w-5 h-5" />
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  b.active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                )}>
                  {b.active ? '● Ativo' : '○ Inativo'}
                </span>
              </div>

              <div className="mb-1">
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  {b.code}
                </span>
              </div>
              <div className="text-base font-bold text-white mt-1.5 mb-0.5">{b.name}</div>
              {b.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3 h-3" /> {b.location}
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-[#1A2333]">
                <button onClick={() => openEdit(b)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-[#222834] hover:text-blue-400 hover:border-blue-500/30 transition-all">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => toggleActive(b)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    b.active
                      ? 'text-slate-400 border-[#222834] hover:text-red-400 hover:border-red-500/30'
                      : 'text-slate-400 border-[#222834] hover:text-emerald-400 hover:border-emerald-500/30'
                  )}>
                  {b.active ? <><PowerOff className="w-3 h-3" /> Desativar</> : <><Power className="w-3 h-3" /> Ativar</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
