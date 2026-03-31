import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export function Toast({
  message,
  type = "info",
  onClose,
  durationMs = 5000,
}: {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
  durationMs?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
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
      icon: <CheckCircle className="text-emerald-600" size={20} />,
      border: "border-emerald-200",
      bg: "bg-emerald-50",
    },
    error: {
      icon: <AlertCircle className="text-red-600" size={20} />,
      border: "border-red-200",
      bg: "bg-red-50",
    },
    info: {
      icon: <Info className="text-blue-600" size={20} />,
      border: "border-blue-200",
      bg: "bg-blue-50",
    },
  };

  const { icon, border, bg } = config[type];

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div
        className={`flex items-start gap-3 ${bg} border ${border} shadow-lg rounded-xl p-4 min-w-[300px] max-w-sm`}
      >
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-muted hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
