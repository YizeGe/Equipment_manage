"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, LogIn, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Btn, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/api/auth/login", { password });
      router.replace("/equipment");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-600/30 to-fuchsia-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-gradient-to-tr from-violet-600/20 to-sky-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-900/50">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">校园设备管理平台</h1>
          <p className="mt-1.5 text-[13px] text-slate-400">仅限管理员登录使用</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-slate-300">
              <Lock size={13} className="text-slate-400" />
              管理员密码
            </span>
            <Input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="border-white/15 bg-white/10 text-white placeholder:text-slate-500 focus:border-violet-400 focus:ring-violet-500/20"
            />
          </label>

          {error && (
            <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </p>
          )}

          <Btn type="submit" disabled={!password || busy} className="mt-5 h-11 w-full text-[15px]" icon={<LogIn size={16} />}>
            {busy ? "验证中…" : "登 录"}
          </Btn>
        </form>

        <p className="mt-6 text-center text-[11.5px] text-slate-500">
          登录后可管理设备台账、借用登记与 3D 打印服务
        </p>
      </div>
    </div>
  );
}
