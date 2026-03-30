import React from 'react'
import { Settings } from 'lucide-react'

export default function ConfiguracoesPage() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                <Settings className="w-8 h-8 text-slate-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Configurações Gerais</h2>
                <p className="text-slate-400 max-w-sm">Módulo em desenvolvimento. Parâmetros do sistema, taxas das viações e regras de negócio da Central Viagens.</p>
            </div>
        </div>
    )
}
