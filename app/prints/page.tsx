"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Trash2, Printer, Rocket, PackageCheck, Hammer, X, CheckCircle2, Phone,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  type PrintOrder, printStatusMeta, MATERIALS,
} from "@/lib/types";
import { cx, fmtDateTime, relTime } from "@/lib/utils";
import {
  Btn, Badge, Card, CardHeader, Empty, Modal, Field, Input, Select, Textarea,
  ConfirmDialog, type ConfirmState, Th, Td,
} from "@/components/ui";
import { useToast } from "@/components/toast";

type TabKey = "all" | "pending" | "printing" | "done" | "delivered" | "rejected";

export default function PrintsPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<PrintOrder[] | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [rejectFor, setRejectFor] = useState<PrintOrder | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PrintOrder | null>(null);

  const load = useCallback(async () => {
    setOrders(await api.get<PrintOrder[]>("/api/prints"));
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message || "加载失败", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const counts = useMemo(() => {
    const os = orders ?? [];
    return {
      all: os.length,
      pending: os.filter((o) => o.status === "pending").length,
      printing: os.filter((o) => o.status === "printing").length,
      done: os.filter((o) => o.status === "done").length,
      delivered: os.filter((o) => o.status === "delivered").length,
      rejected: os.filter((o) => o.status === "rejected").length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      if (tab !== "all" && o.status !== tab) return false;
      if (kw && !`${o.student} ${o.className} ${o.content} ${o.material} ${o.phone}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [orders, q, tab]);

  const act = async (o: PrintOrder, action: "start" | "finish" | "deliver" | "reject", reason?: string) => {
    try {
      await api.patch(`/api/prints/${o.id}`, { action, reason });
      toast(
        action === "start" ? `工单已开始打印（${o.student}）` :
        action === "finish" ? "已标记打印完成，等待交付" :
        action === "deliver" ? "已确认交付给学生" : "已拒绝该打印申请",
        "success"
      );
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "操作失败", "error");
    }
  };

  const doDelete = async (o: PrintOrder) => {
    try {
      await api.del(`/api/prints/${o.id}`);
      toast("工单已删除", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "删除失败", "error");
    }
  };

  return (
    <div className="space-y-7">
      {/* 统计条 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "待接单", value: counts.pending, icon: Rocket, cls: "text-violet-600", bg: "bg-violet-50 text-violet-500" },
          { label: "打印中", value: counts.printing, icon: Printer, cls: "text-sky-600", bg: "bg-sky-50 text-sky-500" },
          { label: "待交付", value: counts.done, icon: PackageCheck, cls: "text-amber-600", bg: "bg-amber-50 text-amber-500" },
          { label: "累计已交付", value: counts.delivered, icon: CheckCircle2, cls: "text-emerald-600", bg: "bg-emerald-50 text-emerald-500" },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm">
            <span className={cx("flex h-11 w-11 items-center justify-center rounded-xl", c.bg)}><c.icon size={19} /></span>
            <div>
              <p className={cx("tnum text-[24px] font-bold leading-none", c.cls)}>{c.value}</p>
              <p className="mt-1.5 text-xs text-slate-400">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 工具栏 */}
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="搜索姓名 / 班级 / 需求…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9 text-[13px]" />
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <Btn size="sm" icon={<Plus size={14} />} onClick={() => setFormOpen(true)}>新建打印申请</Btn>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {([
            { k: "all", label: "全部" },
            { k: "pending", label: "待接单" },
            { k: "printing", label: "打印中" },
            { k: "done", label: "待交付" },
            { k: "delivered", label: "已交付" },
            { k: "rejected", label: "已拒绝" },
          ] as { k: TabKey; label: string }[]).map((o) => {
            const active = tab === o.k;
            return (
              <button key={o.k} onClick={() => setTab(o.k)}
                className={cx(
                  "inline-flex h-8.5 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition",
                  active ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
                )}>
                {o.label}
                <span className={cx("tnum rounded-full px-1.5 text-[10.5px]", active ? "bg-white/20" : "bg-white text-slate-400")}>
                  {counts[o.k]}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 工单表 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px]">
            <thead className="bg-slate-50/80">
              <tr>
                <Th>申请人</Th>
                <Th>打印需求</Th>
                <Th>规格</Th>
                <Th>申请时间</Th>
                <Th>进度 / 交付情况</Th>
                <Th className="text-right">操作</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => {
                return (
                  <tr key={o.id} className="transition hover:bg-indigo-50/30">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-[13px] font-bold text-violet-600">
                          {o.student.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-slate-800">{o.student}</p>
                          <p className="flex items-center gap-1 text-[11.5px] text-slate-400">
                            {o.className}
                            {o.phone && <span className="inline-flex items-center gap-0.5"><Phone size={9} />{o.phone}</span>}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="max-w-[240px]">
                      <p className="truncate text-[13px] font-medium text-slate-700" title={o.content}>{o.content}</p>
                      {o.note && <p className="mt-0.5 truncate text-[11px] text-slate-400" title={o.note}>备注：{o.note}</p>}
                      {o.status === "rejected" && o.rejectReason && (
                        <p className="mt-0.5 truncate text-[11px] text-rose-400" title={o.rejectReason}>驳回：{o.rejectReason}</p>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="tnum text-[13px] font-semibold text-slate-700">×{o.quantity}</span>
                      <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{o.material}</span>
                    </Td>
                    <Td className="text-xs text-slate-400" title={fmtDateTime(o.createdAt)}>{relTime(o.createdAt)}</Td>
                    <Td>
                      <Badge meta={printStatusMeta[o.status]} pulse={o.status === "pending" || o.status === "printing"} />
                      <div className="mt-1 space-y-0.5 text-[10.5px] leading-tight text-slate-400">
                        {o.startAt && <p>开印 {relTime(o.startAt)}</p>}
                        {o.finishAt && <p>完成 {relTime(o.finishAt)}</p>}
                        {o.deliverAt && <p className="text-emerald-600">交付 {fmtDateTime(o.deliverAt)}</p>}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {o.status === "pending" && (
                          <>
                            <Btn size="xs" variant="success" icon={<Hammer size={12} />} onClick={() => act(o, "start")}>开始打印</Btn>
                            <Btn size="xs" variant="outline" className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                              icon={<X size={12} />} onClick={() => setRejectFor(o)}>拒绝</Btn>
                          </>
                        )}
                        {o.status === "printing" && (
                          <Btn size="xs" variant="soft" icon={<CheckCircle2 size={12} />} onClick={() => act(o, "finish")}>标记完成</Btn>
                        )}
                        {o.status === "done" && (
                          <Btn size="xs" variant="success" icon={<PackageCheck size={12} />} onClick={() => act(o, "deliver")}>确认交付</Btn>
                        )}
                        {o.status !== "pending" && o.status !== "printing" && (
                          <Btn size="xs" variant="ghost" className="text-slate-400 hover:text-rose-600" title="删除工单"
                            icon={<Trash2 size={13} />}
                            onClick={() => {
                              setPendingDelete(o);
                              setConfirm({
                                title: "删除打印工单", danger: true, yesText: "删除",
                                msg: <>确定删除 <b>{o.student}</b>（{o.className}）的工单「{o.content}」吗？</>,
                              });
                            }} />
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <Empty icon={<Printer size={20} />} text={orders?.length ? "没有符合条件的工单" : "还没有 3D 打印工单"}
              sub={orders?.length ? undefined : "学生申请打印服务后，工单会显示在这里，负责人可接单、标记完成并确认交付"} />
          )}
        </div>
      </Card>

      <PrintFormModal open={formOpen} onClose={() => setFormOpen(false)}
        onSaved={async () => { setFormOpen(false); await load(); }} />

      <RejectModal rec={rejectFor} onClose={() => setRejectFor(null)}
        onSubmit={async (reason) => {
          if (rejectFor) await act(rejectFor, "reject", reason);
          setRejectFor(null);
        }} />

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)}
        onYes={() => { if (pendingDelete) { doDelete(pendingDelete); setPendingDelete(null); } }} />
    </div>
  );
}

// ---------- 新建申请表单 ----------
function PrintFormModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    student: "", className: "", phone: "", content: "", quantity: "1",
    material: "PLA", note: "",
  });

  useEffect(() => {
    if (open) setF({ student: "", className: "", phone: "", content: "", quantity: "1", material: "PLA", note: "" });
  }, [open]);

  const canSave = f.student.trim() && f.className.trim() && f.content.trim() && Number(f.quantity) >= 1;

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/prints", {
        student: f.student, className: f.className, phone: f.phone, content: f.content,
        quantity: Math.floor(Number(f.quantity)), material: f.material, note: f.note,
      });
      toast("打印申请已提交", "success");
      await onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "提交失败", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="学生 3D 打印申请" width="max-w-xl"
      icon={<Printer size={17} />}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>取消</Btn>
          <Btn disabled={!canSave || saving} onClick={save}>{saving ? "提交中…" : "提交申请"}</Btn>
        </>
      }>
      <div className="grid grid-cols-2 gap-4">
        <Field label="学生姓名" required>
          <Input value={f.student} placeholder="如：陈子涵" onChange={(e) => setF({ ...f, student: e.target.value })} />
        </Field>
        <Field label="班级" required>
          <Input value={f.className} placeholder="如：高二(1)班" onChange={(e) => setF({ ...f, className: e.target.value })} />
        </Field>
        <Field label="联系电话" className="col-span-2" hint="便于交付时通知">
          <Input value={f.phone} placeholder="选填" onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="打印需求描述" required className="col-span-2">
          <Textarea rows={3} value={f.content} placeholder="描述要打印的模型 / 用途 / 特殊要求，如：机械臂关节连接件 ×4，需 0.2mm 层高"
            onChange={(e) => setF({ ...f, content: e.target.value })} />
        </Field>
        <Field label="打印数量" required>
          <Input type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        </Field>
        <Field label="材料">
          <Select value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })}>
            {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="备注" className="col-span-2">
          <Input value={f.note} placeholder="选填，如：交付后需电话通知" onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
      </div>
      <p className="mt-3.5 flex items-center gap-1.5 text-xs leading-relaxed text-slate-400">
        <Hammer size={12} className="shrink-0 text-slate-400" />
        提交后由 3D 打印负责人接单；流程：待接单 → 打印中 → 待交付 → 已交付。
      </p>
    </Modal>
  );
}

// ---------- 拒绝原因 ----------
function RejectModal({ rec, onClose, onSubmit }: {
  rec: PrintOrder | null; onClose: () => void; onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (rec) setReason(""); }, [rec]);
  return (
    <Modal open={!!rec} onClose={onClose} title="拒绝打印申请" width="max-w-md"
      icon={<X size={17} className="text-rose-500" />}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>取消</Btn>
          <Btn variant="danger" onClick={() => onSubmit(reason)}>确认拒绝</Btn>
        </>
      }>
      <p className="text-sm text-slate-600">
        将拒绝 <b className="text-slate-800">{rec?.student}</b>（{rec?.className}）的工单「{rec?.content}」。
      </p>
      <Field label="拒绝原因（选填，将展示给学生）" className="mt-4">
        <Textarea rows={3} value={reason} placeholder="如：涉及安全敏感模型、超出打印尺寸等"
          onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}
