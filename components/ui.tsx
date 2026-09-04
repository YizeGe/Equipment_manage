"use client";

import { useEffect, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X, AlertTriangle } from "lucide-react";
import { cx, tone } from "@/lib/utils";
import type { ToneMeta } from "@/lib/types";

// ---------------- 按钮 ----------------
type BtnVariant = "primary" | "soft" | "ghost" | "danger" | "outline" | "success";

export function Btn({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "xs" | "sm" | "md";
  icon?: ReactNode;
}) {
  const variants: Record<BtnVariant, string> = {
    primary:
      "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30 hover:shadow-lg hover:shadow-violet-500/40 hover:brightness-110 active:scale-[.98]",
    soft: "bg-violet-100 text-violet-700 hover:bg-violet-200",
    success:
      "bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 hover:brightness-110 active:scale-[.98]",
    danger:
      "bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30 hover:brightness-110 active:scale-[.98]",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    outline:
      "border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-600",
  };
  const sizes = {
    xs: "h-7.5 px-3 text-xs gap-1 rounded-lg",
    sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
    md: "h-10 px-4.5 text-sm gap-2 rounded-xl",
  };
  return (
    <button
      className={cx(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

// ---------------- 徽标 ----------------
export function Badge({ meta, pulse }: { meta: ToneMeta; pulse?: boolean }) {
  const t = tone(meta.tone);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        t.badge
      )}
    >
      {pulse && meta.dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", t.dot)} />
          <span className={cx("relative inline-flex h-1.5 w-1.5 rounded-full", t.dot)} />
        </span>
      )}
      {meta.label}
    </span>
  );
}

// ---------------- 表单控件 ----------------
const baseField =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-400";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(baseField, "h-10", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(baseField, "h-10 appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[right_0.75rem_center] bg-no-repeat", className)} {...rest}>
      {children}
    </select>
  );
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(baseField, "py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Field({ label, required, hint, children, className }: {
  label: string; required?: boolean; hint?: string; children: ReactNode; className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-slate-600">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {hint && <span className="ml-auto text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

// ---------------- 弹窗 ----------------
export function Modal({ open, onClose, title, children, footer, width = "max-w-lg", icon }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  icon?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-[fadeIn_.15s_ease]" onClick={onClose} />
      <div className={cx("relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[popIn_.18s_ease]", width)}>
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-5">
          {icon && <span className="text-indigo-600">{icon}</span>}
          <h3 className="flex-1 text-[15.5px] font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------- 确认对话框 ----------------
export interface ConfirmState {
  title: string;
  msg?: ReactNode;
  yesText?: string;
  danger?: boolean;
}
export function ConfirmDialog({ state, onYes, onClose }: {
  state: ConfirmState | null;
  onYes: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={!!state} onClose={onClose} title={state?.title ?? ""} width="max-w-sm"
      icon={state?.danger ? <AlertTriangle size={19} className="text-rose-500" /> : undefined}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>取消</Btn>
          <Btn variant={state?.danger ? "danger" : "primary"} onClick={() => { onYes(); onClose(); }}>
            {state?.yesText ?? "确认"}
          </Btn>
        </>
      }>
      {state?.msg && <div className="text-sm leading-relaxed text-slate-600">{state.msg}</div>}
    </Modal>
  );
}

// ---------------- 空状态 ----------------
export function Empty({ icon, text, sub }: { icon?: ReactNode; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>}
      <p className="text-sm font-medium text-slate-500">{text}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ---------------- 数据卡片 ----------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, sub, extra }: { title: ReactNode; sub?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      {extra}
    </div>
  );
}

// ---------------- 筛选 Tab ----------------
export function FilterTabs<T extends string>({ tabs, value, onChange, counts }: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tabs.map((t) => {
        const active = value === t.key;
        const n = counts?.[t.key];
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cx(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all",
              active
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/30"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            )}
          >
            {t.label}
            {n !== undefined && (
              <span className={cx("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------- 工具类 ----------------
export function Th({ children, className, title }: { children?: ReactNode; className?: string; title?: string }) {
  return (
    <th title={title} className={cx("whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400", className)}>
      {children}
    </th>
  );
}
export function Td({ children, className, title }: { children?: ReactNode; className?: string; title?: string }) {
  return <td title={title} className={cx("px-5 py-4 align-middle", className)}>{children}</td>;
}

export function toastErr(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
