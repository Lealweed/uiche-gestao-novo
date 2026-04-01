"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: DrawerProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div
          className={cn(
            "w-screen transform transition-transform duration-300 ease-out",
            sizeClasses[size]
          )}
        >
          <div className="flex h-full flex-col bg-card border-l border-border shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-muted">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-slate-700/50 transition-colors"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Fechar</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DrawerFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-card-elevated",
        className
      )}
    >
      {children}
    </div>
  );
}
