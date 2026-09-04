// ============ 通用小工具 ============

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** YYYY-MM-DD */
export function fmtDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** YYYY-MM-DD HH:mm */
export function fmtDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 相对时间：刚刚 / x分钟前 / x小时前 / 昨天 / x天前 / 日期 */
export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 172800000) return "昨天";
  if (diff < 86400000 * 30) return `${Math.floor(diff / 86400000)} 天前`;
  return fmtDate(iso);
}

export function plural(n: number, unit: string): string {
  return `${n} ${unit}`;
}

/** 给 tailwind 色键的 badge/圆点样式表 */
export const toneClasses: Record<
  string,
  { badge: string; dot: string; text: string; bar: string }
> = {
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    bar: "bg-emerald-500",
  },
  sky: {
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    text: "text-sky-600",
    bar: "bg-sky-500",
  },
  amber: {
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
    text: "text-amber-600",
    bar: "bg-amber-500",
  },
  violet: {
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
    dot: "bg-violet-500",
    text: "text-violet-600",
    bar: "bg-violet-500",
  },
  rose: {
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-500",
    text: "text-rose-600",
    bar: "bg-rose-500",
  },
  slate: {
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
    text: "text-slate-500",
    bar: "bg-slate-400",
  },
  indigo: {
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    dot: "bg-indigo-500",
    text: "text-indigo-600",
    bar: "bg-indigo-500",
  },
};

export function tone(t: string) {
  return toneClasses[t] ?? toneClasses.slate;
}
