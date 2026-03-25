"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { clsx } from "clsx";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg: string) => addToast(msg, "success"), [addToast]),
    error: useCallback((msg: string) => addToast(msg, "error"), [addToast]),
    info: useCallback((msg: string) => addToast(msg, "info"), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle; bg: string; border: string; text: string }
> = {
  success: {
    icon: CheckCircle,
    bg: "bg-success/10",
    border: "border-success/20",
    text: "text-success",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-danger/10",
    border: "border-danger/20",
    text: "text-danger",
  },
  info: {
    icon: Info,
    bg: "bg-accent/10",
    border: "border-accent/20",
    text: "text-accent",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm",
        "animate-slide-in-right min-w-[280px] max-w-[420px]",
        config.bg,
        config.border
      )}
      role="alert"
    >
      <Icon className={clsx("h-4 w-4 flex-shrink-0", config.text)} />
      <p className="flex-1 text-sm text-foreground">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-muted hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
