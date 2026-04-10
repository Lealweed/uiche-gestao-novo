"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCheck, Download, Eye, MessageSquare, Paperclip, RefreshCw, Send, Store, Users, X } from "lucide-react";

import { boothOf, nameOf } from "@/lib/admin/admin-helpers";
import { isImageChatAttachment } from "@/lib/chat-attachments";
import { Badge } from "@/components/rebuild/ui/badge";
import { Button } from "@/components/rebuild/ui/button";
import { Card } from "@/components/rebuild/ui/card";
import { Input } from "@/components/rebuild/ui/input";
import { SectionHeader } from "@/components/rebuild/ui/section-header";
import { StatCard } from "@/components/rebuild/ui/stat-card";

type OperatorMessageRow = {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  operator_id: string;
  booth_id: string | null;
  sender_role: "operator" | "admin";
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  attachment_url?: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { name: string; code: string } | { name: string; code: string }[] | null;
};

type OperatorBoothLinkRow = {
  id: string;
  active: boolean;
  operator_id?: string;
  booth_id?: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  booths: { name: string; code: string } | { name: string; code: string }[] | null;
};

type MessageConversation = {
  operatorId: string;
  boothId: string | null;
  operatorName: string;
  boothName: string;
};

type ConversationItem = MessageConversation & {
  key: string;
  boothCode: string;
  lastMessage: string;
  lastAt: string | null;
  unreadMessages: number;
};

type AdminMessagesSectionProps = {
  unreadCount: number;
  operatorMessages: OperatorMessageRow[];
  operatorBoothLinks: OperatorBoothLinkRow[];
  activeConversation: MessageConversation | null;
  adminReply: string;
  adminReplyAttachmentName: string | null;
  adminReplyAttachmentKey: number;
  isMounted: boolean;
  onAdminReplyChange: (value: string) => void;
  onAdminReplyAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearAdminReplyAttachment: () => void;
  onRefresh: () => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onMarkAsRead: (messageId: string) => void | Promise<void>;
  onSelectConversation: (conversation: MessageConversation) => void | Promise<void>;
  onSendReply: () => void | Promise<void>;
};

export function AdminMessagesSection({
  unreadCount,
  operatorMessages,
  operatorBoothLinks,
  activeConversation,
  adminReply,
  adminReplyAttachmentName,
  adminReplyAttachmentKey,
  isMounted,
  onAdminReplyChange,
  onAdminReplyAttachmentChange,
  onClearAdminReplyAttachment,
  onRefresh,
  onMarkAllRead,
  onMarkAsRead,
  onSelectConversation,
  onSendReply,
}: AdminMessagesSectionProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const conversations = useMemo<ConversationItem[]>(() => {
    const conversationMap = new Map<string, ConversationItem>();

    for (const link of operatorBoothLinks) {
      if (!link.active || !link.operator_id) continue;
      const booth = boothOf(link.booths);
      const boothId = link.booth_id ?? null;
      const key = `${link.operator_id}:${boothId ?? "sem-guiche"}`;

      conversationMap.set(key, {
        key,
        operatorId: link.operator_id,
        boothId,
        operatorName: nameOf(link.profiles) ?? "Operador",
        boothName: booth?.name ?? "Guiche",
        boothCode: booth?.code ?? "--",
        lastMessage: "Sem mensagens ainda.",
        lastAt: null,
        unreadMessages: 0,
      });
    }

    for (const message of operatorMessages) {
      const booth = boothOf(message.booths);
      const key = `${message.operator_id}:${message.booth_id ?? "sem-guiche"}`;
      const existing = conversationMap.get(key);
      const messageTime = new Date(message.created_at).getTime();
      const existingTime = existing?.lastAt ? new Date(existing.lastAt).getTime() : 0;

      conversationMap.set(key, {
        key,
        operatorId: message.operator_id,
        boothId: message.booth_id,
        operatorName: existing?.operatorName ?? nameOf(message.profiles) ?? "Operador",
        boothName: existing?.boothName ?? booth?.name ?? "Guiche",
        boothCode: existing?.boothCode ?? booth?.code ?? "--",
        lastMessage: messageTime >= existingTime ? message.message : existing?.lastMessage ?? message.message,
        lastAt: messageTime >= existingTime ? message.created_at : existing?.lastAt ?? message.created_at,
        unreadMessages: (existing?.unreadMessages ?? 0) + (!message.read && message.sender_role === "operator" ? 1 : 0),
      });
    }

    return Array.from(conversationMap.values()).sort((a, b) => {
      if (b.unreadMessages !== a.unreadMessages) return b.unreadMessages - a.unreadMessages;
      if (a.lastAt && b.lastAt) return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      if (b.lastAt) return 1;
      if (a.lastAt) return -1;
      return a.boothName.localeCompare(b.boothName);
    });
  }, [operatorBoothLinks, operatorMessages]);

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.operatorId === activeConversation?.operatorId &&
        conversation.boothId === (activeConversation?.boothId ?? null)
    ) ?? conversations[0] ?? null;

  const visibleMessages = useMemo(() => {
    if (!selectedConversation) return [];

    return operatorMessages
      .filter(
        (message) =>
          message.operator_id === selectedConversation.operatorId &&
          (message.booth_id ?? null) === (selectedConversation.boothId ?? null)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [operatorMessages, selectedConversation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length, selectedConversation?.key]);

  async function handleSendReply() {
    if (isSending) return;
    setIsSending(true);
    try {
      await onSendReply();
    } finally {
      setIsSending(false);
    }
  }

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Conversas Privadas" subtitle="Inbox operacional por guiche, com historico separado e resposta direta do admin." />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={unreadCount > 0 ? "warning" : "secondary"} className="text-sm">
            {unreadCount} nao lida{unreadCount !== 1 ? "s" : ""}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => void handleRefresh()} loading={isRefreshing}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Marcar todas as ${unreadCount} mensagem(ns) como lidas?`)) void onMarkAllRead(); }}>
            <CheckCheck className="mr-1 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Guiches</h3>
              <p className="text-xs text-muted">Selecione uma conversa privada</p>
            </div>
            <Badge variant="secondary">{conversations.length}</Badge>
          </div>

          {conversations.length === 0 ? (
            <div className="py-10 text-center">
              <Store size={40} className="mx-auto mb-3 text-muted opacity-50" />
              <p className="text-sm text-muted">Nenhuma conversa iniciada ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const isSelected = conversation.key === selectedConversation?.key;
                return (
                  <button
                    key={conversation.key}
                    type="button"
                    onClick={() => void onSelectConversation(conversation)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/10 shadow-lg"
                        : "border-border bg-slate-900/30 hover:border-primary/20 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{conversation.boothCode}</p>
                        <p className="truncate font-semibold text-foreground">{conversation.boothName}</p>
                        <p className="truncate text-xs text-muted">{conversation.operatorName}</p>
                      </div>
                      {conversation.unreadMessages > 0 && (
                        <Badge variant="warning">{conversation.unreadMessages}</Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted">{conversation.lastMessage}</p>
                    <p className="mt-2 text-[11px] text-muted">
                      {conversation.lastAt && isMounted ? new Date(conversation.lastAt).toLocaleString("pt-BR") : "Sem historico"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="flex min-h-[560px] flex-col">
          {selectedConversation ? (
            <>
              <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedConversation.boothName}</h3>
                  <p className="text-xs text-muted">Conversa com {selectedConversation.operatorName}</p>
                </div>
                <Badge variant={selectedConversation.unreadMessages > 0 ? "warning" : "secondary"}>
                  {selectedConversation.unreadMessages > 0 ? `${selectedConversation.unreadMessages} nova(s)` : "Em dia"}
                </Badge>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {visibleMessages.length === 0 ? (
                  <div className="py-14 text-center">
                    <MessageSquare size={48} className="mx-auto mb-3 text-muted opacity-50" />
                    <p className="text-muted">Nenhuma mensagem nessa conversa ainda.</p>
                    <p className="mt-1 text-xs text-muted">Envie a primeira mensagem para iniciar o historico do guiche.</p>
                  </div>
                ) : (
                  visibleMessages.map((message) => {
                    const sentByAdmin = message.sender_role === "admin";
                    return (
                      <div key={message.id} className={`flex ${sentByAdmin ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl border p-3 ${
                            sentByAdmin
                              ? "rounded-br-sm border-primary/30 bg-primary/15"
                              : "rounded-bl-sm border-border bg-slate-800/60"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span className={`text-[11px] font-semibold uppercase tracking-wide ${sentByAdmin ? "text-primary" : "text-emerald-400"}`}>
                              {sentByAdmin ? "Admin" : nameOf(message.profiles) ?? "Operador"}
                            </span>
                            {!sentByAdmin && !message.read && <Badge variant="warning">Nova</Badge>}
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-foreground/90">{message.message}</p>
                          {message.attachment_url && (
                            <div className="mt-3">
                              {isImageChatAttachment(message.attachment_type, message.attachment_name) ? (
                                <a href={message.attachment_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
                                  <img
                                    src={message.attachment_url}
                                    alt={message.attachment_name ?? "Imagem anexada"}
                                    className="max-h-64 w-full object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={message.attachment_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted/40"
                                >
                                  <Download className="h-4 w-4" />
                                  {message.attachment_name ?? "Baixar arquivo"}
                                </a>
                              )}
                            </div>
                          )}
                          <div className={`mt-2 flex items-center gap-2 text-xs text-muted ${sentByAdmin ? "justify-end" : "justify-between"}`}>
                            <span>{isMounted ? new Date(message.created_at).toLocaleString("pt-BR") : "--"}</span>
                            {!sentByAdmin && !message.read && (
                              <Button variant="ghost" size="sm" onClick={() => void onMarkAsRead(message.id)} title="Marcar como lida">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted/40">
                    <Paperclip className="h-4 w-4" />
                    Anexar arquivo
                    <input
                      key={adminReplyAttachmentKey}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                      onChange={onAdminReplyAttachmentChange}
                    />
                  </label>

                  {adminReplyAttachmentName && (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
                      <span className="max-w-[220px] truncate">{adminReplyAttachmentName}</span>
                      <button type="button" onClick={onClearAdminReplyAttachment} className="text-muted hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={adminReply}
                    onChange={(event) => onAdminReplyChange(event.target.value)}
                    placeholder={`Responder ${selectedConversation.boothName}...`}
                    className="flex-1"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendReply();
                      }
                    }}
                  />
                  <Button variant="primary" onClick={() => void handleSendReply()} loading={isSending} disabled={(!adminReply.trim() && !adminReplyAttachmentName) || isSending}>
                    <Send className="h-4 w-4" />
                    Enviar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <MessageSquare size={48} className="mx-auto mb-3 text-muted opacity-50" />
                <p className="text-muted">Selecione um guiche para abrir a conversa.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Conversas" value={conversations.length.toString()} icon={<MessageSquare className="h-5 w-5" />} />
        <StatCard
          title="Nao Lidas"
          value={unreadCount.toString()}
          icon={<AlertCircle className="h-5 w-5" />}
          trend={unreadCount > 0 ? { value: unreadCount, positive: false } : undefined}
        />
        <StatCard
          title="Operadores Ativos"
          value={new Set(conversations.map((conversation) => conversation.operatorId)).size.toString()}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
