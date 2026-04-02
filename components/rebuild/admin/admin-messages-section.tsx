"use client";

import { AlertCircle, CheckCheck, Eye, MessageSquare, RefreshCw, Users } from "lucide-react";

import { nameOf } from "@/lib/admin/admin-helpers";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";

type OperatorMessageRow = {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  operator_id: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type AdminMessagesSectionProps = {
  unreadCount: number;
  operatorMessages: OperatorMessageRow[];
  isMounted: boolean;
  onRefresh: () => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onMarkAsRead: (messageId: string) => void | Promise<void>;
};

export function AdminMessagesSection({
  unreadCount,
  operatorMessages,
  isMounted,
  onRefresh,
  onMarkAllRead,
  onMarkAsRead,
}: AdminMessagesSectionProps) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Central de Mensagens" subtitle="Mensagens recebidas dos operadores" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={unreadCount > 0 ? "warning" : "secondary"} className="text-sm">
            {unreadCount} nao lida{unreadCount !== 1 ? "s" : ""}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => void onRefresh()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Atualizar
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => void onMarkAllRead()}>
            <CheckCheck className="mr-1 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card>
        {operatorMessages.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare size={48} className="mx-auto mb-3 text-muted opacity-50" />
            <p className="text-muted">Nenhuma mensagem recebida.</p>
            <p className="mt-1 text-xs text-muted">As mensagens dos operadores aparecerao aqui.</p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => void onRefresh()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Carregar mensagens
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {operatorMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 transition-colors ${!msg.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-slate-800/30"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-3">
                    <div className={`size-10 rounded-full flex items-center justify-center ${!msg.read ? "bg-primary/20" : "bg-slate-700"}`}>
                      <MessageSquare size={18} className={!msg.read ? "text-primary" : "text-muted"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold text-foreground">{nameOf(msg.profiles) ?? "Operador"}</span>
                        {!msg.read && (
                          <Badge variant="primary" className="px-1.5 py-0 text-[10px]">
                            NOVA
                          </Badge>
                        )}
                      </div>
                      <p className="mb-2 text-sm text-foreground/90">{msg.message}</p>
                      <p className="text-xs text-muted">
                        {isMounted ? new Date(msg.created_at).toLocaleString("pt-BR") : "--"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!msg.read && (
                      <Button variant="ghost" size="sm" onClick={() => void onMarkAsRead(msg.id)} title="Marcar como lida">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Total de Mensagens" value={operatorMessages.length.toString()} icon={<MessageSquare className="h-5 w-5" />} />
        <StatCard
          title="Nao Lidas"
          value={unreadCount.toString()}
          icon={<AlertCircle className="h-5 w-5" />}
          trend={unreadCount > 0 ? { value: unreadCount, positive: false } : undefined}
        />
        <StatCard
          title="Operadores Ativos"
          value={new Set(operatorMessages.map((m) => m.operator_id)).size.toString()}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
