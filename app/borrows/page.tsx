"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, ClipboardList, Check, X, CalendarClock, RotateCcw, UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  toView, type Equipment, type EquipmentView, type BorrowRecord,
  borrowStatusMeta,
} from "@/lib/types";
import { cx, fmtDateTime, relTime } from "@/lib/utils";
import {
  Btn, Badge, Card, CardHeader, Empty, Modal, Field, Input, Select, Textarea,
  ConfirmDialog, type ConfirmState, Th, Td,
} from "@/components/ui";
import { useToast } from "@/components/toast";

type TabKey = "all" | "pending" | "active" | "returned" | "rejected";

export default function BorrowsPage() {
  const toast = useToast();
  const [borrows, setBorrows] = useState<BorrowRecord[] | null>(null);
  const [eqs, setEqs] = useState<EquipmentView[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BorrowRecord | null>(null);
  const [rejectFor, setRejectFor] = useState<BorrowRecord | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BorrowRecord | null>(null);

  const load = useCallback(async () => {
    const [bs, es] = await Promise.all([
      api.get<BorrowRecord[]>("/api/borrows"),
      api.get<Equipment[]>("/api/equipment"),
    ]);
    setBorrows(bs);
    setEqs(es.map(toView));
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message || "加载失败", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const counts = useMemo(() => {
    const bs = borrows ?? [];
    return {
      all: bs.length,
      pending: bs.filter((b) => b.status === "pending").length,
      active: bs.filter((b) => b.status === "approved").length,
      returned: bs.filter((b) => b.status === "returned").length,
      rejected: bs.filter((b) => b.status === "rejected").length,
    };
  }, [borrows]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (borrows ?? []).filter((b) => {
      if (tab === "pending" && b.status !== "pending") return false;
      if (tab === "active" && b.status !== "approved") return false;
      if (tab === "returned" && b.status !== "returned") return false;
      if (tab === "rejected" && b.status !== "rejected") return false;
      if (kw && !`${b.student} ${b.className} ${b.equipmentName} ${b.reason}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [borrows, q, tab]);

  const eqById = useMemo(() => new Map(eqs.map((e) => [e.id, e])), [eqs]);

  const act = async (b: BorrowRecord, action: "approve" | "reject" | "return", reason?: string) => {
    try {
      await api.patch(`/api/borrows/${b.id}`, { action, reason });
      toast(
        action === "approve" ? `已批准 ${b.student} 的申请，库存已同步` :
        action === "return" ? "已登记归还，库存已恢复" : "已拒绝该申请",
        "success"
      );
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "操作失败", "error");
    }
  };

  const doDelete = async (b: BorrowRecord) => {
    try {
      await api.del(`/api/borrows/${b.id}`);
      toast("记录已删除", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "删除失败", "error");
    }
  };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (b: BorrowRecord) => { setEditing(b); setFormOpen(true); };

  return (
    <div className="space-y-7">
      {/* 统计条 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "待审批申请", value: counts.pending, icon: CalendarClock, cls: "text-amber-600", bg: "bg-amber-50 text-amber-500" },
          { label: "借用中", value: counts.active, icon: ClipboardList, cls: "text-sky-600", bg: "bg-sky-50 text-sky-500" },
          { label: "已归还", value: counts.returned, icon: RotateCcw, cls: "text-emerald-600", bg: "bg-emerald-50 text-emerald-500" },
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
            <Input placeholder="搜索姓名 / 班级 / 设备…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9 text-[13px]" />
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <Btn size="sm" icon={<Plus size={14} />} onClick={openAdd}>新建借用申请</Btn>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {([
            { k: "all", label: "全部" },
            { k: "pending", label: "待审批" },
            { k: "active", label: "借用中" },
            { k: "returned", label: "已归还" },
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

      {/* 表格 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50/80">
              <tr>
                <Th>申请人</Th>
                <Th>设备</Th>
                <Th>用途</Th>
                <Th>申请时间</Th>
                <Th>处理时间</Th>
                <Th>状态</Th>
                <Th className="text-right">操作</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const badge = borrowStatusMeta[b.status];
                const active = b.status === "approved";
                return (
                  <tr key={b.id} className="transition hover:bg-indigo-50/30">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-[13px] font-bold text-indigo-600">
                          {b.student.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-slate-800">{b.student}</p>
                          <p className="text-[11.5px] text-slate-400">{b.className}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-[13px] font-medium text-slate-700">{b.equipmentName}</p>
                      <p className="tnum text-[11.5px] text-slate-400">×{b.quantity}
                        {!active && eqById.has(b.equipmentId) && (
                          <span className="ml-1.5 text-slate-300">现剩余 {eqById.get(b.equipmentId)!.available}</span>
                        )}
                      </p>
                    </Td>
                    <Td className="max-w-[200px]">
                      <p className="truncate text-[12.5px] text-slate-500" title={b.reason}>{b.reason || <span className="text-slate-300">—</span>}</p>
                      {b.rejectReason && (
                        <p className="mt-0.5 truncate text-[11px] text-rose-400" title={b.rejectReason}>驳回：{b.rejectReason}</p>
                      )}
                    </Td>
                    <Td className="text-xs text-slate-400" title={fmtDateTime(b.applyAt)}>{relTime(b.applyAt)}</Td>
                    <Td>
                      {b.status === "returned" && b.returnedAt && (
                        <p className="text-[12px] text-slate-500">归还于 {fmtDateTime(b.returnedAt)}</p>
                      )}
                      {b.status === "approved" && b.approveAt && (
                        <p className="text-[12px] text-slate-500">批准于 {fmtDateTime(b.approveAt)}</p>
                      )}
                      {(b.status === "pending" || b.status === "rejected") && (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>
                    <Td><Badge meta={badge} pulse={b.status === "pending"} /></Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {b.status === "pending" && (
                          <>
                            <Btn size="xs" variant="success" icon={<Check size={12} />} onClick={() => act(b, "approve")}>批准</Btn>
                            <Btn size="xs" variant="outline" className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                              icon={<X size={12} />} onClick={() => setRejectFor(b)}>拒绝</Btn>
                            <Btn size="xs" variant="ghost" icon={<Pencil size={12} />} onClick={() => openEdit(b)}>编辑</Btn>
                          </>
                        )}
                        {b.status === "approved" && (
                          <Btn size="xs" icon={<RotateCcw size={12} />} onClick={() => act(b, "return")}>登记归还</Btn>
                        )}
                        <Btn size="xs" variant="ghost" className="text-slate-400 hover:text-rose-600" title="删除记录"
                          icon={<Trash2 size={13} />}
                          onClick={() => {
                            setPendingDelete(b);
                            setConfirm({
                              title: "删除借用记录", danger: true, yesText: "删除",
                              msg: <>确定删除 <b>{b.student}</b>（{b.className}）借用「{b.equipmentName} ×{b.quantity}」的记录吗？{b.status === "approved" && " 该设备当前处于借用中，建议先登记归还。"}</>,
                            });
                          }} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <Empty icon={<ClipboardList size={20} />} text={borrows?.length ? "没有符合条件的记录" : "还没有借用记录"}
              sub={borrows?.length ? undefined : "学生需要借用设备时，点击右上角「新建借用申请」登记，审批通过后自动扣减库存"} />
          )}
        </div>
      </Card>

      {/* 新建 / 编辑申请 */}
      <BorrowFormModal open={formOpen} edit={editing} eqs={eqs}
        onClose={() => setFormOpen(false)}
        onSaved={async () => { setFormOpen(false); await load(); }} />

      {/* 拒绝原因 */}
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

// ---------- 申请 / 编辑表单 ----------
function BorrowFormModal({ open, edit, eqs, onClose, onSaved }: {
  open: boolean;
  edit: BorrowRecord | null;
  eqs: EquipmentView[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    student: "", className: "", equipmentId: "", quantity: "1", reason: "",
  });

  useEffect(() => {
    if (open) {
      setF({
        student: edit?.student ?? "",
        className: edit?.className ?? "",
        equipmentId: edit?.equipmentId ?? eqs.find((e) => e.available > 0)?.id ?? "",
        quantity: String(edit?.quantity ?? 1),
        reason: edit?.reason ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit, eqs]);

  const pick = eqs.find((e) => e.id === f.equipmentId);
  const qty = Math.max(1, Math.floor(Number(f.quantity) || 1));
  const over = pick ? qty > pick.available : false;
  const canSave = f.student.trim() && f.className.trim() && f.equipmentId && !over;

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        student: f.student, className: f.className, equipmentId: f.equipmentId,
        quantity: qty, reason: f.reason,
      };
      if (edit) await api.patch(`/api/borrows/${edit.id}`, payload);
      else await api.post("/api/borrows", payload);
      toast(edit ? "申请已更新" : "借用申请已提交，等待负责人审批", "success");
      await onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const groups = useMemo(() => {
    const m = new Map<string, EquipmentView[]>();
    for (const e of eqs) {
      const arr = m.get(e.category) ?? [];
      arr.push(e);
      m.set(e.category, arr);
    }
    return [...m.entries()];
  }, [eqs]);

  return (
    <Modal open={open} onClose={onClose} title={edit ? "编辑借用申请" : "学生借用申请"} width="max-w-xl"
      icon={edit ? <Pencil size={17} /> : <UserRound size={17} />}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>取消</Btn>
          <Btn disabled={!canSave || saving} onClick={save}>{saving ? "提交中…" : edit ? "保存修改" : "提交申请"}</Btn>
        </>
      }>
      <div className="grid grid-cols-2 gap-4">
        <Field label="学生姓名" required>
          <Input value={f.student} placeholder="如：王小明" onChange={(e) => setF({ ...f, student: e.target.value })} />
        </Field>
        <Field label="班级" required>
          <Input value={f.className} placeholder="如：高二(3)班" onChange={(e) => setF({ ...f, className: e.target.value })} />
        </Field>
        <Field label="借用设备" required className="col-span-2" hint={pick ? `当前可借 ${pick.available} 件` : undefined}>
          <Select value={f.equipmentId} onChange={(e) => { setF({ ...f, equipmentId: e.target.value, quantity: "1" }); }}>
            {eqs.length === 0 && <option value="">暂无设备可借</option>}
            {groups.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((e) => (
                  <option key={e.id} value={e.id} disabled={e.available <= 0 && e.id !== edit?.equipmentId}>
                    {e.name}（剩余 {e.available}）
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="借用数量" required hint={pick ? `最多 ${pick.available}` : undefined}>
          <Input type="number" min={1} max={pick?.available} value={f.quantity}
            onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        </Field>
        <Field label="借用用途" required className="col-span-2">
          <Textarea rows={2} value={f.reason} placeholder="简要说明用途，便于负责人审批（如：拍摄学校宣传片、课堂展示用）"
            onChange={(e) => setF({ ...f, reason: e.target.value })} />
        </Field>
      </div>
      {over && pick && (
        <p className="mt-3.5 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-600">
          借用数量超出「{pick.name}」当前可借数量（{pick.available} 件），请调整。
        </p>
      )}
      <p className="mt-3.5 text-xs leading-relaxed text-slate-400">
        提交后需设备负责人审批；批准时自动扣减设备剩余数量，登记归还后自动恢复。
      </p>
    </Modal>
  );
}

// ---------- 拒绝原因 ----------
function RejectModal({ rec, onClose, onSubmit }: {
  rec: BorrowRecord | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (rec) setReason(""); }, [rec]);
  return (
    <Modal open={!!rec} onClose={onClose} title="拒绝借用申请" width="max-w-md"
      icon={<X size={17} className="text-rose-500" />}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>取消</Btn>
          <Btn variant="danger" onClick={() => onSubmit(reason)}>确认拒绝</Btn>
        </>
      }>
      <p className="text-sm text-slate-600">
        将拒绝 <b className="text-slate-800">{rec?.student}</b>（{rec?.className}）借用「{rec?.equipmentName} ×{rec?.quantity}」的申请。
      </p>
      <Field label="拒绝原因（选填，将展示给学生）" className="mt-4">
        <Textarea rows={3} value={reason} placeholder="如：该设备仅限课堂教学使用"
          onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}
