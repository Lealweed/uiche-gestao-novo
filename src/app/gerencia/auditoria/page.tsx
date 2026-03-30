import React from 'react'
import { ClipboardList } from 'lucide-react'

export default function AuditoriaPage() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-rose-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Logs de Auditoria</h2>
                <p className="text-slate-400 max-w-sm">Módulo em desenvolvimento. Rastreio absoluto de todas as aberturas, fechamentos de caixa, sangrias e suprimentos do sistema.</p>
            </div>
        </div>
    )
}
