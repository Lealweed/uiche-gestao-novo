import React from 'react'
import { Terminal } from 'lucide-react'

export default function TerminaisPage() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Terminal className="w-8 h-8 text-blue-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Gestão de Terminais</h2>
                <p className="text-slate-400 max-w-sm">Módulo em desenvolvimento. Aqui você poderá gerenciar as permissões e o status de cada terminal PDV da rede.</p>
            </div>
        </div>
    )
}
