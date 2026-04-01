"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  type = "info",
  onClose,
  durationMs = 4000,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setIsLeaving(false);
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(onClose, 300);
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message, durationMs, onClose]);

  if (!message && !isVisible) return null;

  const config = {
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      iconColor: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      progress: "bg-emerald-500",
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      iconColor: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      progress: "bg-red-500",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      iconColor: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      progress: "bg-amber-500",
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      iconColor: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      progress: "bg-blue-500",
    },
  };

  const { icon, iconColor, bg, border, progress } = config[type];

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[100] transform transition-all duration-300 ease-out",
        isVisible && !isLeaving
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-4 opacity-0 scale-95"
      )}
    >
      <div
        className={cn(
          "relative flex items-start gap-3 bg-card border shadow-2xl rounded-xl p-4 min-w-[320px] max-w-md overflow-hidden",
          border
        )}
      >
        {/* Icon */}
        <div className={cn("flex-shrink-0 mt-0.5", iconColor)}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-md text-muted hover:text-foreground hover:bg-slate-700/50 transition-colors"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Fechar</span>
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/30">
          <div
            className={cn("h-full transition-all ease-linear", progress)}
            style={{
              width: isLeaving ? "0%" : "100%",
              transitionDuration: `${durationMs}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Toast container para múltiplos toasts
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ transform: `translateY(${index * -8}px)` }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
