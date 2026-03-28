'use client'

import React, { useState } from 'react'

import { 
    Building2, 
    User, 
    MapPin, 
    CircleDollarSign, 
    CreditCard, 
    ReceiptText, 
    CheckCircle2,
    Ticket,
    Loader2,
    Smartphone,
    Banknote
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function NovaVendaPage() {
    // Form fields
    const [empresa, setEmpresa] = useState('')
    const [passageiro, setPassageiro] = useState('')
    const [destino, setDestino] = useState('')
    const [valor, setValor] = useState('')
    const [pagamento, setPagamento] = useState('Pix')

    // Supabase e Status
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const formasPagamento = [
        { id: 'Pix', label: 'PIX', icon: Smartphone },
        { id: 'Dinheiro', label: 'Dinheiro', icon: Banknote },
        { id: 'Cartão de Débito', label: 'Débito', icon: CreditCard },
        { id: 'Cartão de Crédito', label: 'Crédito', icon: CreditCard },
    ]

    // Formatação segura do valor
    const numericValue = parseFloat(valor.replace(',', '.'))
    const valorFormatado = !isNaN(numericValue) && valor.trim() !== ''
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue)
        : 'R$ 0,00'

    const handleConfirmarVenda = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        if (!empresa || !passageiro || !destino || !valor || !pagamento) {
            setError('Preencha todos os campos do recibo.')
            setLoading(false)
            return
        }

        const valueNum = parseFloat(valor.replace(',', '.'))
        if (isNaN(valueNum)) {
            setError('Valor inválido.')
            setLoading(false)
            return
        }

        const { error: dbError } = await supabase
            .from('vendas')
            .insert({
                empresa_parceira: empresa,
                passageiro: passageiro,
                destino: destino,
                valor: valueNum,
                forma_pagamento: pagamento
            })

        if (dbError) {
            setError('Erro ao registrar no banco de dados.')
            setLoading(false)
            return
        }

        setSuccess('Venda realizada com sucesso!')
        setEmpresa(''); setPassageiro(''); setDestino(''); setValor('');
        setLoading(false)
        setTimeout(() => setSuccess(''), 4000)
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/5">
                        <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">Nova Passagem</h2>
                        <p className="text-slate-500 text-sm mt-0.5">Emissão de bilhete e registro instantâneo no caixa.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleConfirmarVenda} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* LADO ESQUERDO: Formulário */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#151923] border border-[#222834] rounded-2xl p-8 shadow-xl">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Dados da Operação
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-300">Viação Parceira</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-amber-500 transition-colors">
                                        <Building2 className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <select 
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#0B0E14] border border-[#222834] rounded-xl text-white appearance-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all cursor-pointer"
                                        value={empresa}
                                        onChange={(e) => setEmpresa(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Selecione a viação...</option>
                                        <option value="Viação Ouro e Prata">Viação Ouro e Prata</option>
                                        <option value="Boa Esperança">Boa Esperança</option>
                                        <option value="Satélite Norte">Satélite Norte</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-300">Nome do Passageiro</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-amber-500 transition-colors">
                                        <User className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Nome completo do passageiro"
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#0B0E14] border border-[#222834] rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all uppercase"
                                        value={passageiro}
                                        onChange={(e) => setPassageiro(e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Cidade Destino</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-amber-500 transition-colors">
                                        <MapPin className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Marabá - PA"
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#0B0E14] border border-[#222834] rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                                        value={destino}
                                        onChange={(e) => setDestino(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Valor (R$)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-amber-500 transition-colors">
                                        <CircleDollarSign className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="0,00"
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#0B0E14] border border-[#222834] rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono"
                                        value={valor}
                                        onChange={(e) => setValor(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151923] border border-[#222834] rounded-2xl p-8 shadow-xl">
                        <label className="text-sm font-medium text-slate-300 mb-4 block">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {formasPagamento.map((forma) => (
                                <button
                                    key={forma.id}
                                    type="button"
                                    onClick={() => setPagamento(forma.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-2",
                                        pagamento === forma.id
                                            ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/5"
                                            : "bg-[#0B0E14] border-[#222834] text-slate-500 hover:border-slate-600 hover:text-slate-300"
                                    )}
                                >
                                    <forma.icon className="w-5 h-5" />
                                    <span className="text-xs font-semibold">{forma.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* LADO DIREITO: Resumo Checkout */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-[#151923]/50 border border-[#222834] rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                        <div className="p-6 border-b border-[#222834] bg-[#1A1F2E]/50">
                            <h3 className="flex items-center gap-2 font-semibold text-white">
                                <ReceiptText className="w-5 h-5 text-amber-500" />
                                Resumo da Emissão
                            </h3>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Viação</span>
                                    <span className="text-white text-sm font-semibold">{empresa || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Destino</span>
                                    <span className="text-white text-sm font-semibold">{destino || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-xs uppercase font-medium tracking-wider">Pagamento</span>
                                    <span className="text-white text-sm font-semibold">{pagamento}</span>
                                </div>
                            </div>

                            <div className="p-5 bg-[#0B0E14] border border-[#222834] rounded-xl text-center">
                                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] block mb-2">Total do Bilhete</span>
                                <div className="text-3xl font-bold text-amber-500 tracking-tight font-mono">
                                    {valorFormatado}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center font-medium animate-pulse">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs text-center font-medium shadow-emerald-500/10 shadow-lg">
                                    {success}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/10 active:scale-[0.98]",
                                    loading 
                                        ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                                        : "bg-amber-500 hover:bg-amber-400 text-[#000]"
                                )}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5" />
                                )}
                                {loading ? 'REGISTRANDO...' : 'FINALIZAR VENDA'}
                            </button>
                            
                            <p className="text-[10px] text-slate-500 text-center px-4 leading-relaxed">
                                Este registro impactará diretamente no fechamento do seu turno operacional.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
