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
    <main className="app-shell flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-md glass-card p-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="muted text-sm">Acesse a plataforma CENTRAL VIAGEM.</p>

        <div>
          <label className="text-sm">E-mail</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="mt-1 field" />
        </div>

        <div>
          <label className="text-sm">Senha</label>
          <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required className="mt-1 field" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button disabled={loading} className="w-full btn-primary disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
