"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, Ticket } from "lucide-react";

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
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError("Perfil nao encontrado. Contacte o administrador.");
      setLoading(false);
      return;
    }

    const role = (profile as { role?: string }).role ?? "";

    if (["admin", "tenant_admin", "financeiro"].includes(role)) {
      router.push("/rebuild/admin");
    } else {
      router.push("/rebuild/operator");
    }
  }

  return (
    <main className="min-h-screen flex bg-background">
      {/* Left side - Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-white/10 mx-auto mb-6">
            <Ticket size={32} className="text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Central Viagens
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Plataforma completa de gestao operacional para guiches, turnos e controle financeiro.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="flex items-center justify-center size-12 rounded-xl bg-primary mb-3">
              <Ticket size={24} className="text-primary-foreground" />
            </div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">
              Central Viagens
            </p>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl shadow-card p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Acesse sua conta
              </h1>
              <p className="text-sm text-muted">
                Entre para continuar a operacao com seguranca.
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
                  className="w-full h-11 px-4 rounded-lg text-sm bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="w-full h-11 px-4 pr-11 rounded-lg text-sm bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
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
                  className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700"
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
                className="w-full h-11 rounded-lg text-sm font-semibold bg-accent text-accent-foreground hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
            <p className="text-center text-xs text-muted-foreground mt-8">
              Plataforma de gestao operacional - Central Viagens
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
