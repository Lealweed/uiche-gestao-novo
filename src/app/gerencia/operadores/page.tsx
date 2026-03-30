import React from 'react'
import { Users } from 'lucide-react'

export default function OperadoresPage() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Controle de Operadores</h2>
                <p className="text-slate-400 max-w-sm">Módulo em desenvolvimento. Controle de acesso, auditoria de sessões e relatórios individuais de produtividade.</p>
            </div>
        </div>
    )
}
