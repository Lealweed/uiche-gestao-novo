'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Loader2, CheckCircle2, AlertCircle, X,
  Monitor, UserCheck, Link2, Unlink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  user_id: string
  full_name: string | null
  role: string
}

interface Booth {
  id: string
  code: string
  name: string
  active: boolean
}

interface OperatorBooth {
  operator_id: string
  booth_id: string
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

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-violet-600 to-purple-700',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-pink-700',
]

export default function EquipePage() {
  const supabase = createClient()
  const [operators, setOperators] = useState<Profile[]>([])
  const [booths, setBooths] = useState<Booth[]>([])
  const [links, setLinks] = useState<OperatorBooth[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (type: Toast['type'], message: string) => setToast({ type, message })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: profiles, error: e1 }, { data: boothsData, error: e2 }, { data: linksData, error: e3 }] =
      await Promise.all([
        supabase.from('profiles').select('user_id, full_name, role').eq('role', 'operator').order('full_name'),
        supabase.from('booths').select('id, code, name, active').eq('active', true).order('code'),
        supabase.from('operator_booths').select('operator_id, booth_id'),
      ])

    if (e1) showToast('error', 'Erro ao carregar operadores: ' + e1.message)
    if (e2) showToast('error', 'Erro ao carregar guichês: ' + e2.message)
    if (e3) showToast('error', 'Erro ao carregar vínculos: ' + e3.message)

    setOperators(profiles ?? [])
    setBooths(boothsData ?? [])
    setLinks(linksData ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  function getLinkedBoothId(operatorId: string): string {
    return links.find(l => l.operator_id === operatorId)?.booth_id ?? ''
  }

  async function handleLinkChange(operatorId: string, newBoothId: string) {
    setSavingId(operatorId)
    const existingLink = links.find(l => l.operator_id === operatorId)

    // Desvincular (selecionou vazio)
    if (!newBoothId) {
      if (!existingLink) { setSavingId(null); return }
      const { error } = await supabase
        .from('operator_booths')
        .delete()
        .eq('operator_id', operatorId)
      if (error) showToast('error', 'Erro ao desvincular: ' + error.message)
      else { showToast('success', 'Operador desvinculado.'); fetchAll() }
      setSavingId(null)
      return
    }

    if (existingLink) {
      // UPDATE
      const { error } = await supabase
        .from('operator_booths')
        .update({ booth_id: newBoothId })
        .eq('operator_id', operatorId)
      if (error) showToast('error', 'Erro ao atualizar vínculo: ' + error.message)
      else { showToast('success', 'Vínculo atualizado!'); fetchAll() }
    } else {
      // INSERT — verifica se o guichê já está ocupado
      const boothTaken = links.find(l => l.booth_id === newBoothId)
      if (boothTaken) {
        const takenBy = operators.find(o => o.user_id === boothTaken.operator_id)
        showToast('error', `Guichê já vinculado a ${takenBy?.full_name ?? 'outro operador'}.`)
        setSavingId(null)
        return
      }
      const { error } = await supabase
        .from('operator_booths')
        .insert({ operator_id: operatorId, booth_id: newBoothId })
      if (error) {
        const msg = error.code === '23505'
          ? 'Conflito: este vínculo já existe.'
          : 'Erro ao vincular: ' + error.message
        showToast('error', msg)
      } else { showToast('success', 'Operador vinculado com sucesso!'); fetchAll() }
    }
    setSavingId(null)
  }

  async function removeLink(operatorId: string) {
    setSavingId(operatorId)
    const { error } = await supabase
      .from('operator_booths')
      .delete()
      .eq('operator_id', operatorId)
    if (error) showToast('error', 'Erro ao desvincular: ' + error.message)
    else { showToast('success', 'Vínculo removido.'); fetchAll() }
    setSavingId(null)
  }

  const linkedBoothIds = new Set(links.map(l => l.booth_id))

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vínculo de Equipe</h1>
          <p className="text-slate-500 text-sm">Associe operadores aos guichês ativos.</p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Operadores', value: operators.length, icon: Users, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
          { label: 'Guichês Ativos', value: booths.length, icon: Monitor, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Vinculados', value: links.length, icon: Link2, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
        ].map(s => (
          <div key={s.label} className={cn('p-4 rounded-xl border shadow-lg bg-[#151923]', s.color)}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border mb-3', s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-[#151923] border border-[#1A2333] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1A2333]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-violet-400" />
            Operadores & Guichês
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : operators.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum operador cadastrado com role = &quot;operator&quot;.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B0E14]/60 border-b border-[#1A2333]">
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operador</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-mail</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guichê Vinculado</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2333]">
              {operators.map((op, idx) => {
                const linkedId = getLinkedBoothId(op.user_id)
                const linkedBooth = booths.find(b => b.id === linkedId)
                const isSaving = savingId === op.user_id

                return (
                  <tr key={op.user_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br flex-shrink-0',
                          AVATAR_COLORS[idx % AVATAR_COLORS.length]
                        )}>
                          {initials(op.full_name)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-200">{op.full_name ?? 'Sem nome'}</div>
                          <div className="text-[10px] text-slate-600 font-mono">{op.user_id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">—</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {isSaving ? (
                          <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                          </div>
                        ) : (
                          <select
                            className="w-full max-w-[220px] px-3 py-2 bg-[#0B0E14] border border-[#222834] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer"
                            value={linkedId}
                            onChange={e => handleLinkChange(op.user_id, e.target.value)}
                          >
                            <option value="">— Sem guichê —</option>
                            {booths.map(b => {
                              const takenByOther = linkedBoothIds.has(b.id) && b.id !== linkedId
                              return (
                                <option key={b.id} value={b.id} disabled={takenByOther}>
                                  {b.code} — {b.name}{takenByOther ? ' (ocupado)' : ''}
                                </option>
                              )
                            })}
                          </select>
                        )}
                        {linkedBooth && !isSaving && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ✓ {linkedBooth.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {linkedId && !isSaving ? (
                        <button
                          onClick={() => removeLink(op.user_id)}
                          className="flex items-center gap-1.5 ml-auto text-[11px] font-semibold text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/5 px-2.5 py-1.5 rounded-lg transition-all"
                          title="Remover vínculo"
                        >
                          <Unlink className="w-3.5 h-3.5" /> Desvincular
                        </button>
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {booths.length === 0 && !loading && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300/80">
            Nenhum guichê ativo encontrado. Cadastre guichês em <strong>Guichês</strong> antes de vincular operadores.
          </p>
        </div>
      )}
    </div>
  )
}
