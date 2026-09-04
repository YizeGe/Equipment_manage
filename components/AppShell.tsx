"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Boxes, ClipboardList, Printer, GraduationCap, ShieldCheck, LogOut } from "lucide-react";
import { cx } from "@/lib/utils";
import { api } from "@/lib/api";

const nav = [
  { href: "/equipment", label: "设备管理", icon: Boxes },
  { href: "/borrows", label: "借用登记", icon: ClipboardList },
  { href: "/prints", label: "3D 打印服务", icon: Printer },
];

const pageMeta: Record<string, { title: string; desc: string }> = {
  "/equipment": { title: "设备管理", desc: "设备台账、CSV 导入与维护" },
  "/borrows": { title: "学生借用登记", desc: "申请、审批与归还管理" },
  "/prints": { title: "3D 打印服务", desc: "打印工单与交付管理" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const meta = pageMeta[pathname] ?? { title: "", desc: "" };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout", {});
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  // 登录页：不显示侧边栏与页头
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#f5f6fb] text-slate-800">
      {/* 侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-slate-950 lg:flex">
        <div className="flex items-center gap-3 px-5 pt-7 pb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-900/40">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight text-white">校园设备管理</p>
            <p className="text-[11px] text-slate-400">Equipment Center</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/50"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={18} className={cx(active ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90" />}
              </Link>
            );
          })}
        </nav>

        <div className="m-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-300">
              <ShieldCheck size={14} className="text-emerald-400" />
              设备管理负责人
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              借出与归还自动同步设备库存；当前数据存于本地文件，部署到 Vercel 后可接入 Postgres 数据库。
            </p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[12.5px] font-medium text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      </aside>

      {/* 移动端顶栏 */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <GraduationCap size={17} />
        </div>
        <span className="text-[15px] font-bold">校园设备管理</span>
        <nav className="ml-auto flex items-center gap-1.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={cx("rounded-lg p-2", active ? "bg-indigo-50 text-indigo-600" : "text-slate-400")}>
                <Icon size={19} />
              </Link>
            );
          })}
          <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:text-rose-500" title="退出登录">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      {/* 主区域 */}
      <main className="min-w-0 flex-1 lg:pl-60">
        <div className="mx-auto w-full max-w-7xl px-5 pt-20 pb-20 sm:px-8 lg:px-10 lg:pt-10">
          <div className="mb-8">
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900">{meta.title}</h1>
            <p className="mt-1 text-[13.5px] text-slate-500">{meta.desc}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
