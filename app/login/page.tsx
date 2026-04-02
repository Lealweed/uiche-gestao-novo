"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getHomeRouteForRole, getRoleLabel } from "@/lib/rbac";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signError || !data.user) {
      setError(signError?.message ?? "Falha ao autenticar. Verifique as credenciais.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,active")
      .eq("user_id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError("Perfil nao encontrado. Contacte o administrador.");
      setLoading(false);
      return;
    }

    const resolvedProfile = profile as { role?: string; active?: boolean };
    const role = resolvedProfile.role ?? "";
    const isActive = resolvedProfile.active !== false;

    if (!isActive) {
      await supabase.auth.signOut();
      setError("Seu acesso esta inativo. Contacte o administrador.");
      setLoading(false);
      return;
    }

    const destination = getHomeRouteForRole(role);

    if (!destination) {
      await supabase.auth.signOut();
      setError(`${getRoleLabel(role)} sem rota habilitada no sistema.`);
      setLoading(false);
      return;
    }

    router.replace(destination);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center size-14 rounded-xl bg-primary text-primary-foreground font-bold text-xl mb-4">
            C
          </div>
          <h2 className="text-xl font-bold text-foreground">Central Viagens</h2>
          <p className="text-sm text-muted">Plataforma de Gestao Operacional</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Acesse sua conta
            </h1>
            <p className="text-sm text-muted">
              Entre para continuar a operacao
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-foreground"
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
                className="w-full h-12 px-4 rounded-lg text-sm bg-input border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-foreground"
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
                  placeholder="Digite sua senha"
                  disabled={loading}
                  className="w-full h-12 px-4 pr-12 rounded-lg text-sm bg-input border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive"
              >
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full h-12 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted mt-8">
            Ambiente seguro - Central Viagens
          </p>
        </div>
      </div>
    </main>
  );
}
