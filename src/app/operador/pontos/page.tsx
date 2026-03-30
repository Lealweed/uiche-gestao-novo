import React from 'react'
import { Clock } from 'lucide-react'

export default function PontoDigitalPage() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Clock className="w-8 h-8 text-blue-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Ponto Digital</h2>
                <p className="text-slate-400 max-w-sm">Módulo em desenvolvimento. Aqui você poderá registrar entrada, pausas e saída do seu expediente de trabalho.</p>
            </div>
        </div>
    )
}
