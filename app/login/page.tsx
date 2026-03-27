"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Lock, Mail, Ticket } from "lucide-react";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });

    if (signError || !data.user) {
      setError(signError?.message ?? "Falha ao autenticar. Verifique suas credenciais.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError("Usuário sem perfil configurado. Contacte o administrador.");
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
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--ds-bg)" }}
    >
      {/* Background — vertical scan lines (industrial) */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              rgba(245,158,11,0.018) 40px,
              rgba(245,158,11,0.018) 41px
            )
          `,
        }}
      />

      {/* Amber focal glow — top center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        aria-hidden="true"
        style={{
          width: "560px",
          height: "320px",
          background: "radial-gradient(ellipse at center top, rgba(245,158,11,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Corner accent — bottom right */}
      <div
        className="absolute bottom-0 right-0 pointer-events-none"
        aria-hidden="true"
        style={{
          width: "300px",
          height: "300px",
          background: "radial-gradient(ellipse at bottom right, rgba(245,158,11,0.06) 0%, transparent 65%)",
        }}
      />

      {/* Card */}
      <div className="w-full max-w-[420px] relative z-10" style={{ animation: "fadeUp 0.35s ease" }}>
        {/* Top accent bar */}
        <div
          className="h-[2px] w-full mb-0 rounded-t"
          style={{ background: "linear-gradient(90deg, transparent 0%, var(--ds-primary) 40%, var(--ds-primary-hover) 60%, transparent 100%)" }}
          aria-hidden="true"
        />

        <div
          style={{
            background: "var(--ds-surface-1)",
            border: "1px solid var(--ds-border-strong)",
            borderTop: "none",
            borderRadius: "0 0 var(--ds-radius-lg) var(--ds-radius-lg)",
            boxShadow: "var(--ds-shadow-xl), var(--ds-glow-amber)",
            padding: "2.25rem 2rem",
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-7">
            {/* Logo mark */}
            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--ds-radius-sm)",
                background: "linear-gradient(135deg, var(--ds-primary) 0%, var(--ds-primary-dim) 100%)",
                boxShadow: "0 0 0 1px rgba(245,158,11,0.4), 0 4px 16px rgba(245,158,11,0.25)",
              }}
              aria-hidden="true"
            >
              <Ticket size={22} className="text-[#0A0E14]" strokeWidth={2.5} />
            </div>

            <p
              className="mb-1"
              style={{
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--ds-primary)",
              }}
            >
              Central Viagens
            </p>

            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--ds-text)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Acesse sua conta
            </h1>

            <p
              className="mt-1.5"
              style={{ fontSize: "0.8125rem", color: "var(--ds-muted)" }}
            >
              Entre para continuar a operação com segurança.
            </p>
          </div>

          {/* Divider */}
          <div
            className="mb-6"
            style={{ borderTop: "1px solid var(--ds-border)" }}
            aria-hidden="true"
          />

          {/* Form */}
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ds-muted)",
                  marginBottom: "0.375rem",
                }}
              >
                E-mail
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--ds-dim)" }}
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  aria-required="true"
                  className="rb-field"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                style={{
                  display: "block",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ds-muted)",
                  marginBottom: "0.375rem",
                }}
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--ds-dim)" }}
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-required="true"
                  className="rb-field"
                  style={{ paddingLeft: "2.25rem", paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--ds-dim)" }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2 rounded text-sm"
                style={{
                  background: "var(--ds-danger-soft)",
                  border: "1px solid rgba(248,113,113,0.22)",
                  color: "var(--ds-danger)",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "var(--ds-radius-sm)",
                }}
                role="alert"
                aria-live="polite"
              >
                <span className="mt-0.5 shrink-0" aria-hidden="true">⚠</span>
                <span style={{ fontSize: "0.8125rem" }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="rb-btn-primary w-full mt-1"
              style={{ fontSize: "0.875rem", letterSpacing: "0.02em" }}
            >
              {loading ? (
                <>
                  <span
                    className="rb-spin inline-block border-2 border-current border-t-transparent rounded-full"
                    style={{ width: "14px", height: "14px" }}
                    aria-hidden="true"
                  />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-center mt-6"
            style={{ fontSize: "0.6875rem", color: "var(--ds-dim)", letterSpacing: "0.02em" }}
          >
            Plataforma de gestão operacional · Central Viagens
          </p>
        </div>
      </div>
    </main>
  );
}
