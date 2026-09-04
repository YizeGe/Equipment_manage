"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, XCircle, AlertTriangle, X } from "lucide-react";
import { cx } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warn";
interface ToastItem {
  id: number;
  type: ToastType;
  msg: string;
}

const ToastCtx = createContext<(msg: string, type?: ToastType) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-emerald-500" />,
  error: <XCircle size={18} className="text-rose-500" />,
  info: <Info size={18} className="text-sky-500" />,
  warn: <AlertTriangle size={18} className="text-amber-500" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((msg: string, type: ToastType = "info") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 shadow-lg shadow-slate-900/8 animate-[toastIn_.25s_ease]",
              t.type === "error" && "border-rose-200",
              t.type === "success" && "border-emerald-200",
              t.type === "warn" && "border-amber-200",
              t.type === "info" && "border-slate-200"
            )}
          >
            <span className="mt-px shrink-0">{icons[t.type]}</span>
            <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-slate-700">{t.msg}</p>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
