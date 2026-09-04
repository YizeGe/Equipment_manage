"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Upload, Search, Pencil, Trash2, FileSpreadsheet,
  Boxes, Package, CircleDot, PackageCheck, AlertTriangle, CheckCircle2, FileUp, X,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  toView, type Equipment, type EquipmentView, type EqStatusKey, eqStatusMeta,
} from "@/lib/types";
import { cx } from "@/lib/utils";
import {
  Btn, Badge, Card, CardHeader, Empty, Modal, Field, Input, Select, ConfirmDialog,
  type ConfirmState, Th, Td,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import {
  detectMapping, normalizeRow, parseCSV, downloadTextFile, TEMPLATE_CSV,
  type ColumnMap, type ImportRow,
} from "@/lib/csv";

type TabKey = "all" | EqStatusKey;

export default function EquipmentPage() {
  const toast = useToast();
  const [items, setItems] = useState<EquipmentView[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [tab, setTab] = useState<TabKey>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentView | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EquipmentView | null>(null);

  const load = useCallback(async () => {
    const eqs = await api.get<Equipment[]>("/api/equipment");
    setItems(eqs.map(toView));
  }, []);

  useEffect(() => {
    load().catch((e) => toast(e.message || "加载失败", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const cats = useMemo(() => {
    const s = new Set((items ?? []).map((e) => e.category));
    return ["all", ...s].map((c) => ({
      key: c,
      label: c === "all" ? "全部分类" : c,
    }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Partial<Record<TabKey, number>> = { all: items?.length ?? 0 };
    for (const k of ["idle", "inuse", "loaned", "partial", "empty"] as EqStatusKey[]) {
      c[k] = (items ?? []).filter((e) => e.statusKey === k).length;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (items ?? []).filter((e) => {
      if (tab !== "all" && e.statusKey !== tab) return false;
      if (cat !== "all" && e.category !== cat) return false;
      if (kw && !`${e.name} ${e.category} ${e.remark}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [items, q, cat, tab]);

  const sum = useMemo(() => filtered.reduce(
    (s, e) => ({
      total: s.total + e.total,
      inUse: s.inUse + e.inUse,
      loaned: s.loaned + e.loaned,
      avail: s.avail + e.available,
    }),
    { total: 0, inUse: 0, loaned: 0, avail: 0 }
  ), [filtered]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: EquipmentView) => { setEditing(e); setFormOpen(true); };

  const doDelete = async (e: EquipmentView) => {
    try {
      await api.del(`/api/equipment/${e.id}`);
      toast(`已删除「${e.name}」`, "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "删除失败", "error");
    }
  };

  return (
    <div className="space-y-7">
      {/* 汇总条 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "当前列表设备总数", value: sum.total, icon: Boxes, cls: "text-slate-900" },
          { label: "在用", value: sum.inUse, icon: Package, cls: "text-sky-600" },
          { label: "借出", value: sum.loaned, icon: CircleDot, cls: "text-amber-600" },
          { label: "剩余（可借）", value: sum.avail, icon: PackageCheck, cls: "text-emerald-600" },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><c.icon size={19} /></span>
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
            <Input placeholder="搜索名称 / 分类 / 备注…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9 text-[13px]" />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 w-40 text-[13px]">
            {cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
          <div className="ml-auto flex items-center gap-2.5">
            <Btn variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>导入 CSV</Btn>
            <Btn size="sm" icon={<Plus size={14} />} onClick={openAdd}>添加设备</Btn>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterTabsLocal tab={tab} setTab={setTab} counts={counts} />
          <span className="ml-auto hidden items-center gap-1 text-[11.5px] text-slate-400 sm:flex">
            {items ? `共 ${items.length} 种设备` : ""}
          </span>
        </div>
      </Card>

      {/* 设备表 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead className="bg-slate-50/80">
              <tr>
                <Th>设备</Th>
                <Th className="text-center">总数</Th>
                <Th className="text-center">在用</Th>
                <Th className="text-center">借出</Th>
                <Th className="text-center">剩余</Th>
                <Th>状态</Th>
                <Th className="text-right">操作</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const meta = eqStatusMeta[e.statusKey];
                const low = e.total > 0 && e.available === 0;
                return (
                  <tr key={e.id} className={cx("group transition hover:bg-indigo-50/30", low && "bg-rose-50/40 hover:bg-rose-50/60")}>
                    <Td>
                      <p className="text-[13.5px] font-semibold text-slate-800">{e.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-400">
                        <span className="rounded-md bg-violet-50 px-1.5 py-px font-medium text-violet-600">{e.category}</span>
                        {e.remark && <span className="max-w-[200px] truncate" title={e.remark}>{e.remark}</span>}
                      </p>
                    </Td>
                    <Td className="tnum text-center text-sm font-semibold text-slate-800">{e.total}</Td>
                    <Td className="tnum text-center text-sm text-sky-600">{e.inUse > 0 ? e.inUse : <span className="text-slate-300">0</span>}</Td>
                    <Td className="tnum text-center text-sm text-amber-600">{e.loaned > 0 ? e.loaned : <span className="text-slate-300">0</span>}</Td>
                    <Td className={cx("tnum text-center text-sm font-semibold", e.available > 0 ? "text-emerald-600" : "text-rose-500")}>
                      {e.available}
                      {low && <span className="ml-1 inline-flex translate-y-[-1px] items-center gap-0.5 rounded bg-rose-100 px-1 py-px text-[10px] font-medium text-rose-600"><AlertTriangle size={9} />告急</span>}
                    </Td>
                    <Td><Badge meta={meta} /></Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                        <button title="编辑" onClick={() => openEdit(e)} className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={15} /></button>
                        <button title="删除" onClick={() => { setPendingDelete(e); setConfirm({
                          title: "删除设备", danger: true, yesText: "删除",
                          msg: <>确定删除 <b className="text-slate-800">「{e.name}」</b> 吗？若有未归还的借出记录将无法删除。</>,
                        }); }} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <Empty icon={<Boxes size={20} />} text={items?.length ? "没有符合筛选条件的设备" : "还没有设备数据"}
              sub={items?.length ? undefined : "点击右上角「添加设备」或「导入 CSV」开始建立台账"} />
          )}
        </div>
        {items && items.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="text-[11.5px] text-slate-400">筛选结果 {filtered.length} / {items.length} 种 · 借出数量由借用审批自动增减</p>
          </div>
        )}
      </Card>

      {/* 添加 / 编辑弹窗 */}
      <EquipFormModal
        open={formOpen}
        edit={editing}
        onClose={() => setFormOpen(false)}
        onSaved={async () => { setFormOpen(false); await load(); }}
        categories={cats.filter((c) => c.key !== "all").map((c) => c.label)}
      />

      {/* CSV 导入 */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existing={(items ?? []).map((e) => e.name)}
        onDone={async () => { await load(); }}
      />

      <ConfirmDialog
        state={confirm}
        onClose={() => setConfirm(null)}
        onYes={() => { if (pendingDelete) doDelete(pendingDelete); }}
      />
    </div>
  );
}

// ---------- 状态筛选（设备） ----------
function FilterTabsLocal({ tab, setTab, counts }: {
  tab: TabKey; setTab: (v: TabKey) => void;
  counts: Partial<Record<TabKey, number>>;
}) {
  const opts: { key: TabKey; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "idle", label: "空闲" },
    { key: "inuse", label: "在用" },
    { key: "loaned", label: "借出" },
    { key: "partial", label: "部分占用" },
    { key: "empty", label: "无库存" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => {
        const active = tab === o.key;
        const n = counts[o.key];
        return (
          <button key={o.key} onClick={() => setTab(o.key)}
            className={cx(
              "inline-flex h-8.5 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition",
              active ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
            )}>
            {o.label}
            {n !== undefined && <span className={cx("tnum rounded-full px-1.5 text-[10.5px]", active ? "bg-white/20" : "bg-white text-slate-400")}>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------- 添加/编辑设备表单 ----------
function EquipFormModal({ open, edit, onClose, onSaved, categories }: {
  open: boolean;
  edit: EquipmentView | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  categories: string[];
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", category: "", total: "", inUse: "", loaned: "", remark: "" });

  useEffect(() => {
    if (open) {
      setF({
        name: edit?.name ?? "",
        category: edit?.category ?? "",
        total: String(edit?.total ?? ""),
        inUse: String(edit?.inUse ?? "0"),
        loaned: String(edit?.loaned ?? "0"),
        remark: edit?.remark ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit]);

  const n = (s: string) => (s === "" ? 0 : Math.max(0, Math.floor(Number(s) || 0)));
  const total = n(f.total), inUse = n(f.inUse), loaned = n(f.loaned);
  const avail = Math.max(0, total - inUse - loaned);
  const overflow = inUse + loaned > total;
  const name = f.name.trim();
  const canSave = name !== "" && !overflow;

  const save = async () => {
    setSaving(true);
    try {
      const payload = { name, category: f.category, total, inUse, loaned, remark: f.remark };
      if (edit) await api.patch(`/api/equipment/${edit.id}`, payload);
      else await api.post("/api/equipment", payload);
      toast(edit ? "设备信息已更新" : "设备已添加", "success");
      await onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? "编辑设备" : "添加设备"}
      icon={edit ? <Pencil size={17} /> : <Plus size={17} />}
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>取消</Btn>
          <Btn onClick={save} disabled={!canSave || saving}>{saving ? "保存中…" : "保存"}</Btn>
        </>
      }>
      <div className="grid grid-cols-2 gap-4">
        <Field label="设备名称" required className="col-span-2">
          <Input value={f.name} placeholder="如：佳能数码相机 EOS 850D" onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="分类" hint="可输入新分类">
          <Input list="eq-cats" value={f.category} placeholder="如：摄影器材" onChange={(e) => setF({ ...f, category: e.target.value })} />
          <datalist id="eq-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="总数" required>
          <Input type="number" min={0} value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} placeholder="0" />
        </Field>
        <Field label="在用数量" hint="学校内部占用">
          <Input type="number" min={0} value={f.inUse} onChange={(e) => setF({ ...f, inUse: e.target.value })} />
        </Field>
        <Field label="借出数量" hint="审批借出后自动增减">
          <Input type="number" min={0} value={f.loaned} onChange={(e) => setF({ ...f, loaned: e.target.value })} />
        </Field>
        <Field label="备注" className="col-span-2">
          <Input value={f.remark} placeholder="选填" onChange={(e) => setF({ ...f, remark: e.target.value })} />
        </Field>
      </div>

      <div className={cx(
        "mt-4 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px]",
        overflow ? "border-rose-200 bg-rose-50 text-rose-600" : "border-emerald-100 bg-emerald-50/70 text-emerald-700"
      )}>
        {overflow ? (
          <span className="flex items-center gap-1.5"><AlertTriangle size={14} /> 在用 + 借出不能超过总数</span>
        ) : (
          <span className="flex items-center gap-1.5"><PackageCheck size={14} /> 剩余（可借）数量</span>
        )}
        <b className="tnum text-base">{overflow ? "—" : avail}</b>
      </div>
    </Modal>
  );
}

// ---------- CSV 导入向导 ----------
function ImportModal({ open, onClose, existing, onDone }: {
  open: boolean;
  onClose: () => void;
  existing: string[];
  onDone: () => Promise<void>;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<ColumnMap[]>([]);
  const [normRows, setNormRows] = useState<(ImportRow & { srcLine?: number })[]>([]);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"update" | "skip" | "add">("update");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number; issues: string[] } | null>(null);

  useEffect(() => {
    if (!open) {
      setParsed(null); setNormRows([]); setInvalid([]); setFileName(""); setResult(null); setMode("update");
    }
  }, [open]);

  const ingest = (text: string, name: string) => {
    const p = parseCSV(text);
    setFileName(name);
    if (p.headers.length === 0) {
      toast("文件为空或格式不正确", "error");
      return;
    }
    const map = detectMapping(p.headers);
    setMapping(map);
    if (!map.some((m) => m.field === "name")) {
      setParsed(p);
      setNormRows([]);
      setInvalid(["表头中未找到「设备名称」列，请确认 CSV 第一行为表头（如：设备名称,分类,总数,在用,借出,剩余数量,备注）"]);
      return;
    }
    const rows: (ImportRow & { srcLine?: number })[] = [];
    const bad: string[] = [];
    p.rows.forEach((cells, i) => {
      const line = i + 2; // 表头占第 1 行
      const r = normalizeRow(p.headers, cells, line);
      if (r.error) bad.push(r.error);
      else if (r.row) rows.push({ ...r.row, srcLine: line });
    });
    setParsed(p);
    setNormRows(rows);
    setInvalid(bad);
    setResult(null);
  };

  const onFile = (file: File | undefined | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  };

  const matchedFields = mapping.filter((m) => m.field);
  const conflictCount = useMemo(
    () => normRows.filter((r) => existing.includes(r.name ?? "")).length,
    [normRows, existing]
  );

  const doImport = async () => {
    if (normRows.length === 0) return;
    setBusy(true);
    try {
      const res = await api.post<{ added: number; updated: number; skipped: number; issues: string[] }>("/api/equipment/import", { rows: normRows, mode });
      setResult(res);
      toast(`导入完成：新增 ${res.added} · 更新 ${res.updated} · 跳过 ${res.skipped}`, "success");
      await onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "导入失败", "error");
    } finally {
      setBusy(false);
    }
  };

  const fieldLabel = (f: string | null) =>
    f === "name" ? "设备名称*" : f === "category" ? "分类" : f === "total" ? "总数" :
    f === "inUse" ? "在用" : f === "loaned" ? "借出" : f === "available" ? "剩余数量" : "备注";

  return (
    <Modal open={open} onClose={onClose} title="导入设备台账（CSV）" width="max-w-3xl"
      icon={<FileSpreadsheet size={18} />}>
      {!result ? (
        <div className="space-y-4">
          {/* 上传区 */}
          {!parsed ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
                onClick={() => inputRef.current?.click()}
                className={cx(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                  drag ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm ring-1 ring-slate-200">
                  <FileUp size={22} />
                </span>
                <p className="text-sm font-medium text-slate-700">点击选择或拖拽 CSV 文件到此处</p>
                <p className="text-xs text-slate-400">表头支持中文 / 英文列名，自动识别：名称 · 分类 · 总数 · 在用 · 借出 · 剩余数量 · 备注</p>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadTextFile("设备台账模板.csv", TEMPLATE_CSV, "text/csv;charset=utf-8"); }}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  <FileSpreadsheet size={12} /> 下载 CSV 模板
                </button>
                <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <AlertTriangle size={12} className="shrink-0 text-amber-500" />
                每行一件设备；重复导入同名设备时按下方策略处理；借出数量与借用系统联动，请勿手工乱填。
              </p>
            </>
          ) : (
            <div className="space-y-4">
              {/* 已识别信息 */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span className="text-xs font-medium text-slate-600">{fileName} · 共 {parsed.rows.length} 行 · 成功识别 {normRows.length} 行</span>
                {mapping.some((m) => m.field === "name") && (
                  <button onClick={() => { setParsed(null); }} className="ml-auto inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"><X size={11} /> 换一个文件</button>
                )}
              </div>

              {/* 列识别 */}
              <div className="flex flex-wrap gap-1.5">
                {mapping.map((m) => (
                  <span key={m.header} title={`列「${m.header}」`}
                    className={cx(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] ring-1 ring-inset",
                      m.field ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-slate-100 text-slate-400 ring-slate-200"
                    )}>
                    {m.header} → <b>{m.field ? fieldLabel(m.field) : "忽略"}</b>
                  </span>
                ))}
              </div>

              {invalid.length > 0 && (
                <div className="max-h-24 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700">
                  {invalid.slice(0, 6).map((s, i) => <p key={i}>{s}</p>)}
                  {invalid.length > 6 && <p>… 等共 {invalid.length} 条</p>}
                </div>
              )}

              {/* 预览 */}
              {normRows.length > 0 && (
                <>
                  <div className="max-h-52 overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[560px] text-left">
                      <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          {["设备名称", "分类", "总数", "在用", "借出", "剩余(推算)"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-600">
                        {normRows.slice(0, 6).map((r, i) => {
                          const t = r.total ?? 0, iu = r.inUse ?? 0, lo = r.loaned ?? 0;
                          return (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                              <td className="px-3 py-2">{r.category ?? "—"}</td>
                              <td className="tnum px-3 py-2">{t}</td>
                              <td className="tnum px-3 py-2">{iu}</td>
                              <td className="tnum px-3 py-2">{lo}</td>
                              <td className="tnum px-3 py-2 font-semibold text-emerald-600">{Math.max(0, t - iu - lo)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {normRows.length > 6 && <p className="bg-white py-2 text-center text-[11px] text-slate-400">… 还有 {normRows.length - 6} 行未显示</p>}
                  </div>

                  {/* 导入策略 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">同名设备处理：</span>
                    {([
                      { k: "update" as const, label: "更新同名（合并字段）" },
                      { k: "skip" as const, label: "跳过同名" },
                      { k: "add" as const, label: "全部新增" },
                    ]).map((o) => (
                      <button key={o.k} onClick={() => setMode(o.k)}
                        className={cx(
                          "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition",
                          mode === o.k ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                        )}>
                        {o.label}
                        {o.k === "update" && conflictCount > 0 && <span className="ml-1 opacity-80">(命中 {conflictCount})</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2.5">
                <Btn variant="outline" onClick={() => setParsed(null)}>上一步</Btn>
                <Btn disabled={normRows.length === 0 || busy} onClick={doImport}>
                  {busy ? "导入中…" : `确认导入 ${normRows.length} 行`}
                </Btn>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 导入结果 */
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center">
            <CheckCircle2 size={30} className="mx-auto text-emerald-500" />
            <p className="mt-2 text-[15px] font-semibold text-emerald-700">导入完成</p>
            <div className="mt-3 flex justify-center gap-6 text-sm">
              <span className="text-emerald-700"><b className="tnum">{result.added}</b> 新增</span>
              <span className="text-indigo-600"><b className="tnum">{result.updated}</b> 更新</span>
              <span className="text-slate-500"><b className="tnum">{result.skipped}</b> 跳过</span>
            </div>
          </div>
          {result.issues.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700">
              {result.issues.map((s, i) => <p key={i}>{s}</p>)}
            </div>
          )}
          <div className="flex justify-end">
            <Btn onClick={onClose}>完成</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
