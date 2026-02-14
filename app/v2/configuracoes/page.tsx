"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { AdminShell } from "@/components/v2/admin-shell";

type Profile = { user_id: string; full_name: string; role: "admin" | "operator"; active: boolean };

export default function ConfiguracoesV2Page() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id,full_name,role,active").order("full_name").limit(200);
      setProfiles((data as Profile[]) ?? []);
    })();
  }, []);

  return (
    <AdminShell title="Configurações" subtitle="Gestão de perfis e parâmetros administrativos.">
      <section className="cv2-card overflow-auto">
        <h3 className="cv2-section-title">Usuários</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Nome</th><th>Perfil</th><th>Status</th></tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.user_id} className="border-t border-slate-200">
                <td className="py-2">{p.full_name}</td>
                <td>{p.role}</td>
                <td>{p.active ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
