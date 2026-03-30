import React from 'react'
import { Wallet } from 'lucide-react'

export default function FinanceiroPage() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-amber-500" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Dashboard Financeiro</h2>
                <p className="text-slate-400 max-w-sm">Módulo em desenvolvimento. Relatórios de repasses (15% / 85%), conciliação bancária e faturamento líquido.</p>
            </div>
        </div>
    )
}
