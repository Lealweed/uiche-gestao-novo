'use client'

import React, { useState } from 'react'
import { Settings, Shield, Bell, HardDrive, User, Globe, Moon, Sun, Monitor, RefreshCw } from 'lucide-react'

export default function ConfigPage() {
    const [theme, setTheme] = useState('dark')

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="border-b border-[#222834] pb-6">
                <h2 className="text-3xl font-bold text-white tracking-tight">Configurações</h2>
                <p className="text-slate-500 mt-1 font-medium">Preferências do sistema, segurança e parâmetros da conta.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Sidebar Config */}
                <div className="lg:col-span-1 space-y-2">
                    <button className="w-full flex items-center gap-3 px-6 py-4 bg-[#151923] text-white rounded-xl font-bold shadow-xl border border-amber-500/20 transition-all">
                        <User className="w-5 h-5 text-amber-500" />
                        Perfil Operador
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#151923] text-slate-500 hover:text-white rounded-xl font-medium transition-all group">
                        <Monitor className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Aparência
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#151923] text-slate-500 hover:text-white rounded-xl font-medium transition-all group">
                        <Bell className="w-5 h-5 group-hover:text-rose-500 transition-colors" />
                        Notificações
                    </button>
                    <button className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#151923] text-slate-500 hover:text-white rounded-xl font-medium transition-all group">
                        <Shield className="w-5 h-5 group-hover:text-emerald-500 transition-colors" />
                        Segurança
                    </button>
                </div>

                {/* Main Content Config */}
                <div className="lg:col-span-3 space-y-8">
                    
                    {/* Perfil Section */}
                    <div className="p-8 rounded-2xl border border-[#222834] bg-[#151923] shadow-2xl space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>

                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-white mb-6">Informações da Conta</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-[0.2em] block font-bold">NOME COMPLETO</label>
                                    <input 
                                        type="text" 
                                        value="OPERADOR MASTER 01" 
                                        readOnly 
                                        className="w-full bg-[#0B0E14] border border-[#222834] rounded-xl px-6 py-4 text-slate-400 shadow-inner outline-none transition-all cursor-not-allowed font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-[0.2em] block font-bold">MATRÍCULA</label>
                                    <input 
                                        type="text" 
                                        value="#CV-0822-01" 
                                        readOnly 
                                        className="w-full bg-[#0B0E14] border border-[#222834] rounded-xl px-6 py-4 text-slate-400 shadow-inner outline-none transition-all cursor-not-allowed font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-[#222834] relative z-10">
                            <h3 className="text-xl font-bold text-white mb-6">Preferências da Interface</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-4 p-6 rounded-2xl bg-[#0B0E14] border border-[#222834] hover:border-blue-500/20 transition-colors">
                                    <div className="p-3 w-fit rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Idioma do Sistema</p>
                                        <p className="text-xs text-slate-500 font-medium">Ajuste o idioma global da interface.</p>
                                    </div>
                                    <select className="mt-2 bg-[#151923] border border-[#222834] text-slate-200 text-sm rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer">
                                        <option>Português (Brasil)</option>
                                        <option>English (US)</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-4 p-6 rounded-2xl bg-[#0B0E14] border border-[#222834] hover:border-amber-500/20 transition-colors">
                                    <div className="p-3 w-fit rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10">
                                        <Moon className="w-6 h-6" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-white">Tema Escuro</p>
                                            <p className="text-xs text-slate-500 font-medium">Modo alto contraste ativo.</p>
                                        </div>
                                        <div className="w-12 h-6 bg-amber-500 rounded-full p-1 cursor-pointer flex justify-end transition-all shadow-lg shadow-amber-500/20">
                                            <div className="w-4 h-4 bg-black rounded-full shadow-lg"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button className="px-8 py-4 bg-[#0B0E14] hover:bg-[#1A1F2E] text-slate-500 hover:text-white rounded-xl font-bold transition-all border border-[#222834]">Cancelar</button>
                            <button className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold shadow-xl shadow-amber-500/10 transition-all flex items-center gap-2 active:scale-95">
                                <RefreshCw className="w-4 h-4" />
                                Salvar Alterações
                            </button>
                        </div>
                    </div>

                    {/* Versão do Sistema */}
                    <div className="text-center pt-8">
                        <p className="text-[10px] text-slate-700 uppercase tracking-[0.3em] font-bold">
                            Central Viagens PDV • Versão 2.4.0-Stable • © 2026 • Premium Industrial UI
                        </p>
                    </div>

                </div>

            </div>
        </div>
    )
}
