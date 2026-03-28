'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError('E-mail ou senha incorretos. Tente novamente.')
            setLoading(false)
            return
        }

        // O middleware vai automaticamente redirecionar a pessoa para a tela certa
        router.push('/operador')
        router.refresh()
    }
    return (
        <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-1000">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-4">
                        <Lock className="w-3 h-3" />
                        Acesso Restrito
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">Central Viagens</h1>
                    <p className="text-slate-500 font-medium">Plataforma de Operação & Logística</p>
                </div>

                <div className="rounded-2xl border border-[#222834] bg-[#151923] p-10 shadow-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
                    
                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block ml-1">
                                Identificação (E-mail)
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-amber-500 text-slate-600">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-[#0B0E14] border border-[#222834] rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-medium"
                                    placeholder="operador@central.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block ml-1">
                                Chave de Acesso (Senha)
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-amber-500 text-slate-600">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-[#0B0E14] border border-[#222834] rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-xs font-bold text-rose-500 text-center animate-in shake-in-1 duration-300">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 px-6 flex justify-center items-center rounded-xl font-bold text-black bg-amber-500 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10 active:scale-[0.98] disabled:opacity-30 mt-4 h-16"
                        >
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                'Autenticar Operador'
                            )}
                        </button>
                    </form>
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-[10px] text-slate-700 uppercase font-black tracking-[0.3em]">
                        Sync v2.4.0 • Secure Terminal
                    </p>
                </div>
            </div>
        </div>
    )
}
