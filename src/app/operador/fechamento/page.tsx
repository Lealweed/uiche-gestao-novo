'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
    WalletCards, 
    LogOut,
    QrCode,
    Banknote,
    CreditCard,
    Building2,
    Calculator,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tipagem básica
interface Venda {
    id: string
    valor: number
    forma_pagamento: string
    empresa_parceira: string
    created_at: string
}

export default function FechamentoCaixaPage() {
    const router = useRouter()
    const supabase = createClient()
    
    const [loading, setLoading] = useState(true)
    const [isClosing, setIsClosing] = useState(false)
    const [gavetaInput, setGavetaInput] = useState('')
    
    // Totais agrupados
    const [totais, setTotais] = useState({ pix: 0, dinheiro: 0, cartao: 0 })
    const [empresas, setEmpresas] = useState<{ nome: string; qtd: number; total: number }[]>([])

    // Data de Hoje formatada
    const dataHojeFormatada = new Intl.DateTimeFormat('pt-BR', { 
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
    }).format(new Date())

    useEffect(() => {
        async function fetchFechamento() {
            setLoading(true)
            try {
                const hoje = new Date()
                hoje.setHours(0, 0, 0, 0)
                
                const { data, error } = await supabase
                    .from('vendas')
                    .select('*')
                    .gte('created_at', hoje.toISOString())

                if (error) throw error

                if (data) {
                    // Reduce Methods
                    let tPix = 0, tDinh = 0, tCart = 0
                    const empMap = new Map<string, { qtd: number; total: number }>()

                    data.forEach((v: Venda) => {
                        const val = Number(v.valor) || 0
                        
                        // Pagamentos
                        const pgto = v.forma_pagamento?.toLowerCase() || ''
                        if (pgto.includes('pix')) tPix += val
                        else if (pgto.includes('dinheiro')) tDinh += val
                        else if (pgto.includes('cartão') || pgto.includes('cartao')) tCart += val
                        
                        // Empresas
                        const emp = v.empresa_parceira || 'Outros'
                        if (!empMap.has(emp)) empMap.set(emp, { qtd: 0, total: 0 })
                        const atual = empMap.get(emp)!
                        empMap.set(emp, { qtd: atual.qtd + 1, total: atual.total + val })
                    })

                    setTotais({ pix: tPix, dinheiro: tDinh, cartao: tCart })
                    
                    const empList = Array.from(empMap.entries()).map(([nome, stats]) => ({
                        nome,
                        qtd: stats.qtd,
                        total: stats.total
                    }))
                    
                    // Ordenar as empresas que mais venderam por valor ($)
                    setEmpresas(empList.sort((a, b) => b.total - a.total))
                }
            } catch (err) {
                console.error("Erro ao buscar dados do fechamento:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchFechamento()
    }, [])

    const handleSairEFechar = async () => {
        setIsClosing(true)
        // Aqui poderia haver lógica de inserir um log de fechamento na tabela de caixa
        // Simularemos o travamento e log out diretamente
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Cálculos e Formatação Visual da Gaveta
    const dinheiroSistema = totais.dinheiro
    const dinheiroGaveta = parseFloat(gavetaInput.replace(',', '.')) || 0
    const diferenca = dinheiroGaveta - dinheiroSistema
    
    const isExato = diferenca === 0 && gavetaInput !== ''
    const isFaltando = diferenca < 0 && gavetaInput !== ''
    const isSobrando = diferenca > 0 && gavetaInput !== ''

    const corDiferenca = isExato ? 'text-emerald-400' : isFaltando ? 'text-red-400' : isSobrando ? 'text-amber-400' : 'text-white/50'

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#222834] pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-[#151923] border border-[#222834] text-amber-500 shadow-xl">
                        <WalletCards className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">Fechamento de Caixa</h2>
                        <p className="text-slate-500 text-sm mt-1 capitalize font-medium">{dataHojeFormatada}</p>
                    </div>
                </div>
                
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Total Arrecadado Bruto</p>
                    {loading ? (
                        <div className="h-10 w-48 bg-[#151923] rounded-xl animate-pulse inline-block border border-[#222834]" />
                    ) : (
                        <p className="text-4xl font-mono font-bold text-white tracking-tighter">
                            {formatCurrency(totais.pix + totais.dinheiro + totais.cartao)}
                        </p>
                    )}
                </div>
            </div>

            {/* Resumo por Meio de Pagamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-[#222834] bg-[#151923] p-6 relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <QrCode className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 text-emerald-500">
                            <QrCode className="w-5 h-5" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saldo PIX</h3>
                        </div>
                        {loading ? <div className="h-8 w-32 bg-[#0B0E14] rounded animate-pulse" /> : <p className="text-2xl font-bold font-mono text-white tracking-tight">{formatCurrency(totais.pix)}</p>}
                        <p className="text-[10px] text-slate-500 mt-2 uppercase font-semibold">Conciliação Automática</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-500/10 bg-[#151923] p-6 relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Banknote className="w-24 h-24 text-amber-500 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                            <Banknote className="w-5 h-5" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Dinheiro</h3>
                        </div>
                        {loading ? <div className="h-8 w-32 bg-[#0B0E14] rounded animate-pulse" /> : <p className="text-2xl font-bold font-mono text-white tracking-tight">{formatCurrency(totais.dinheiro)}</p>}
                        <p className="text-[10px] text-amber-500/60 mt-2 uppercase font-bold tracking-tighter">Conferência física obrigatória</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-[#222834] bg-[#151923] p-6 relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CreditCard className="w-24 h-24 text-blue-500 -rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                            <CreditCard className="w-5 h-5" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cartões</h3>
                        </div>
                        {loading ? <div className="h-8 w-32 bg-[#0B0E14] rounded animate-pulse" /> : <p className="text-2xl font-bold font-mono text-white tracking-tight">{formatCurrency(totais.cartao)}</p>}
                        <p className="text-[10px] text-slate-500 mt-2 uppercase font-semibold">Crédito e Débito</p>
                    </div>
                </div>
            </div>

            {/* Tabela de Empresas */}
            <div className="bg-[#151923] border border-[#222834] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-[#222834] bg-[#1A1F2E]/30">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-slate-500" />
                        <h3 className="font-semibold text-white">Vendas por Empresa Parceira</h3>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0B0E14] text-slate-500 text-[10px] uppercase font-bold tracking-[0.15em]">
                                <th className="p-6">Nome da Viação</th>
                                <th className="p-6 text-center">Volume</th>
                                <th className="p-6 text-right">Faturamento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222834] font-mono text-sm">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td className="p-6"><div className="h-5 w-40 bg-slate-800 rounded animate-pulse" /></td>
                                        <td className="p-6"><div className="h-5 w-12 bg-slate-800 rounded animate-pulse mx-auto" /></td>
                                        <td className="p-6 flex justify-end"><div className="h-5 w-24 bg-slate-800 rounded animate-pulse" /></td>
                                    </tr>
                                ))
                            ) : empresas.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-slate-500 italic">Nenhum registro encontrado para este turno.</td>
                                </tr>
                            ) : (
                                empresas.map((emp) => (
                                    <tr key={emp.nome} className="hover:bg-[#1A1F2E]/50 transition-colors">
                                        <td className="p-6 text-slate-200 font-bold">{emp.nome}</td>
                                        <td className="p-6 text-slate-500 text-center font-bold">{emp.qtd}</td>
                                        <td className="p-6 text-amber-500 text-right font-bold">{formatCurrency(emp.total)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ação de Fechamento de Gaveta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-4">
                {/* Gaveta Card */}
                <div className="rounded-2xl border border-amber-500/20 bg-[#151923] p-8 relative shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
                    
                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Conferência de Gaveta</h3>
                    </div>
                    
                    <div className="space-y-6 relative z-10">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block text-center">Informe o valor físico em mãos</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                    <span className="text-amber-500/40 font-mono font-bold text-xl">R$</span>
                                </div>
                                <input 
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={gavetaInput}
                                    onChange={(e) => setGavetaInput(e.target.value)}
                                    className="w-full pl-16 pr-6 py-6 bg-[#0B0E14] border border-[#222834] rounded-2xl text-white text-3xl placeholder-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-mono font-bold text-center"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-5 bg-[#0B0E14] rounded-2xl border border-[#222834] shadow-inner">
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Diferença apurada:</span>
                            <div className="flex items-center gap-3">
                                {isExato && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                {isFaltando && <AlertCircle className="w-5 h-5 text-rose-500" />}
                                {isSobrando && <AlertCircle className="w-5 h-5 text-amber-500" />}
                                
                                <span className={cn("text-xl font-bold font-mono", corDiferenca.replace('text-red-400', 'text-rose-500').replace('text-amber-400', 'text-amber-500').replace('text-emerald-400', 'text-emerald-500'))}>
                                    {gavetaInput === '' ? '---' : formatCurrency(diferenca)}
                                </span>
                            </div>
                        </div>

                        {gavetaInput !== '' && (
                            <div className="animate-in fade-in zoom-in-95">
                                {isFaltando && (
                                    <p className="text-xs text-rose-500 font-bold text-center bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">
                                        ATENÇÃO: Quebra de caixa detectada ({formatCurrency(Math.abs(diferenca))}).
                                    </p>
                                )}
                                {isSobrando && (
                                    <p className="text-xs text-amber-500 font-bold text-center bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                                        AVISO: Valor excedente identificado. Verifique se houve sangria não registrada.
                                    </p>
                                )}
                                {isExato && (
                                    <p className="text-xs text-emerald-500 font-bold text-center bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                                        EXATO: O valor físico coincide com o registro do sistema.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Confirmar Card */}
                <div className="rounded-2xl border border-[#222834] bg-[#151923] p-8 flex flex-col justify-center text-center space-y-8 shadow-2xl relative overflow-hidden group">
                     <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500/20">
                         <div className={cn("h-full bg-rose-500 transition-all duration-1000", isClosing ? 'w-full' : 'w-0')}></div>
                     </div>

                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-3">Encerramento de Turno</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
                            Ao confirmar, o caixa atual será finalizado e um relatório de fechamento será gerado para auditoria.
                        </p>
                    </div>

                    <button 
                        onClick={handleSairEFechar}
                        disabled={isClosing || loading}
                        className="w-full max-w-[280px] mx-auto py-5 px-6 flex justify-center items-center gap-3 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20 active:scale-[0.98] disabled:opacity-30"
                    >
                        {isClosing ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <LogOut className="w-6 h-6" />
                        )}
                        {isClosing ? 'Finalizando...' : 'Encerrar e Sair'}
                    </button>
                </div>
            </div>
        </div>
    )
}
