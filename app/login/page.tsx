"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });

    if (signError || !data.user) {
      setError(signError?.message ?? "Falha ao autenticar");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError("Usuário sem perfil configurado.");
      setLoading(false);
      return;
    }

    if (profile.role === "admin") router.push("/admin");
    else router.push("/operator");
  }

  return (
    <main className="cv-login-shell">
      <div className="cv-login-card">
        <div>
          <p className="cv-login-eyebrow">Central Viagens</p>
          <h1 className="cv-login-title">Acesse sua conta</h1>
          <p className="cv-login-subtitle">Entre para continuar a operação com segurança.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="cv-label">E-mail</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="mt-1 field" />
          </div>

          <div>
            <label className="cv-label">Senha</label>
            <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required className="mt-1 field" />
          </div>

          {error ? <p className="cv-error-text">{error}</p> : null}

          <button disabled={loading} className="w-full btn-primary disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
