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
      <section className="cv2-card">
        <h3 className="cv2-section-title">Usuários</h3>
        <div className="cv2-table-wrap">
          <table className="cv2-table">
            <thead>
              <tr><th>Nome</th><th>Perfil</th><th>Status</th></tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.user_id}>
                  <td>{p.full_name}</td>
                  <td className="capitalize">{p.role === "admin" ? "Administrador" : "Operador"}</td>
                  <td><span className={p.active ? "cv2-status-open" : "cv2-status-closed"}>{p.active ? "Ativo" : "Inativo"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
