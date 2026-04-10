"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function OperatorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="max-w-md text-center space-y-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Erro no Painel do Operador</h2>
        <p className="text-sm text-[hsl(var(--muted))]">
          Ocorreu um erro inesperado. Suas transacoes em andamento estao seguras. Nossa equipe ja foi notificada.
        </p>
        {error.digest && (
          <p className="text-xs text-[hsl(var(--muted))] font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Tentar novamente
          </button>
          <a
            href="/login"
            className="px-6 py-2 border border-[hsl(var(--border))] rounded-lg text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
          >
            Voltar ao login
          </a>
        </div>
      </div>
    </div>
  );
}
