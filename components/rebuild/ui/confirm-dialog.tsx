"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Power, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type DialogVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose, loading]);

  if (!open) return null;

  const iconConfig = {
    danger: {
      bg: "bg-red-500/20",
      icon: <Trash2 className="h-6 w-6 text-red-400" />,
      button: "bg-red-500 hover:bg-red-600 text-white",
    },
    warning: {
      bg: "bg-amber-500/20",
      icon: <AlertTriangle className="h-6 w-6 text-amber-400" />,
      button: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    info: {
      bg: "bg-blue-500/20",
      icon: <Power className="h-6 w-6 text-blue-400" />,
      button: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  };

  const config = iconConfig[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-slate-700/50 transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4", config.bg)}>
            {config.icon}
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted">{description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 bg-card-elevated border-t border-border">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50",
              config.button
            )}
          >
            {loading ? "Processando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
