"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDashboardRouteForRole } from "@/lib/auth/roles";
import { Eye, EyeOff, Loader2, Ticket } from "lucide-react";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  /* ── lógica de autenticação ───────────────────────────────── */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. autenticar
    const { data, error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signError || !data.user) {
      setError(signError?.message ?? "Falha ao autenticar. Verifique as credenciais.");
      setLoading(false);
      return;
    }

    // 2. buscar perfil e rota correta
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError("Perfil não encontrado. Contacte o administrador.");
      setLoading(false);
      return;
    }

    const role = (profile as { role?: string }).role ?? "";

    router.push(getDashboardRouteForRole(role));
  }

  /* ── UI ───────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--background))]">

      {/* glows decorativos — puramente CSS, sem dependências */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* glow âmbar central */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/10 blur-3xl" />
        {/* glow sutil canto inferior direito */}
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-amber-500/5 blur-2xl" />
      </div>

      {/* card */}
      <div className="relative w-full max-w-[420px]">

        {/* barra de acento âmbar no topo */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" aria-hidden="true" />

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-b-xl shadow-2xl px-8 py-10">

          {/* header */}
          <div className="flex flex-col items-center text-center mb-8">
            {/* logo mark */}
            <div className="w-12 h-12 rounded-lg bg-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
              <Ticket size={22} className="text-[hsl(var(--background))]" strokeWidth={2.5} />
            </div>

            <p className="text-[11px] tracking-[0.2em] uppercase text-amber-400 font-bold mb-1">
              Central Viagens
            </p>

            <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
              Acesse sua conta
            </h1>

            <p className="text-sm text-[hsl(var(--muted))] mt-1.5">
              Entre para continuar a operação com segurança.
            </p>
          </div>

          <div className="border-t border-[hsl(var(--border))] mb-6" />

          {/* form */}
          <form onSubmit={onSubmit} noValidate className="space-y-5">

            {/* email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={loading}
                className="
                  w-full h-11 px-3 rounded-md text-sm
                  bg-[hsl(var(--input))] border border-[hsl(var(--border))]
                  text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]
                  outline-none ring-0
                  focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-150
                "
              />
            </div>

            {/* senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="
                    w-full h-11 px-3 pr-10 rounded-md text-sm
                    bg-[hsl(var(--input))] border border-[hsl(var(--border))]
                    text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]
                    outline-none ring-0
                    focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-150
                  "
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* erro */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-md px-3 py-2.5 text-sm bg-red-500/10 border border-red-500/25 text-red-400"
              >
                <span className="mt-0.5 shrink-0" aria-hidden="true">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="
                w-full h-11 rounded-md text-sm font-bold tracking-wide
                bg-amber-500 text-[hsl(var(--background))]
                hover:bg-amber-400
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
                flex items-center justify-center gap-2
                shadow-lg shadow-amber-500/20
              "
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* footer */}
          <p className="text-center text-[11px] text-[hsl(var(--muted-foreground))] mt-8 tracking-wide">
            Plataforma de gestão operacional · Central Viagens
          </p>
        </div>
      </div>
    </main>
  );
}
