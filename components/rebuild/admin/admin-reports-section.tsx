"use client";

import { nameOf } from "@/lib/admin/admin-helpers";
import { Badge } from "@/components/rebuild/ui/badge";
import { Card } from "@/components/rebuild/ui/card";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { DataTable } from "@/components/rebuild/ui/table";

type AuditLogRow = {
  id: string;
  action: string;
  entity: string | null;
  details: Record<string, unknown>;
  created_at: string;
  created_by?: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type AdminReportsSectionProps = {
  auditLogs: AuditLogRow[];
};

export function AdminReportsSection({ auditLogs }: AdminReportsSectionProps) {
  return (
    <Card>
      <SectionHeader title="Log de Auditoria" className="mb-4" />
      <DataTable
        columns={[
          { key: "data", header: "Data", render: (row) => new Date(row.created_at).toLocaleString("pt-BR") },
          { key: "usuario", header: "Usuario", render: (row) => nameOf(row.profiles) ?? "-" },
          { key: "acao", header: "Acao", render: (row) => <Badge variant="info">{row.action}</Badge> },
          { key: "entidade", header: "Entidade", render: (row) => row.entity ?? "-" },
        ]}
        rows={auditLogs}
        emptyMessage="Nenhum log de auditoria."
      />
    </Card>
  );
}
