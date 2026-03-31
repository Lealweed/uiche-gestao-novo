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
        setTimeout(onClose, 300); // Wait for transition before fully removing
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message, durationMs, onClose]);

  if (!message && !isVisible) return null;

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const borders = {
    success: "border-emerald-500/50",
    error: "border-red-500/50",
    info: "border-blue-500/50",
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div
        className={`flex items-start gap-3 bg-[#18181b] border ${borders[type]} shadow-2xl rounded-xl p-4 min-w-[300px] max-w-sm`}
      >
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
