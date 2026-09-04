// ============================================================
// 数据层：目前使用本地 JSON 文件存储（.data/db.json），初始为空数据。
//
// 注意：部署到 Vercel 后文件系统不可持久化 —— 接入数据库时
//    只需替换本文件内部实现为 @vercel/postgres 查询，
//    上层 API 路由与页面无需改动（适配点已隔离在此文件）。
//    表结构参考 db/init.sql。
// ============================================================

import fs from "node:fs";
import path from "node:path";
import type { BorrowRecord, Equipment, PrintOrder } from "./types";
import { nowISO, uid } from "./types";

export interface DBShape {
  version: number;
  equipment: Equipment[];
  borrows: BorrowRecord[];
  prints: PrintOrder[];
}

const DB_FILE = path.join(process.cwd(), ".data", "db.json");

let cache: DBShape | null = null;

function emptyDB(): DBShape {
  return { version: 1, equipment: [], borrows: [], prints: [] };
}

function load(): DBShape {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      cache = { ...raw };
      return cache!;
    }
  } catch {
    // 损坏则重建
  }
  const s = emptyDB();
  cache = s;
  persist(s);
  return s;
}

function persist(db: DBShape) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("[store] 写入失败（只读文件系统？部署后需切换数据库）", e);
  }
}

function mutate<T>(fn: (db: DBShape) => T): T {
  const db = load();
  const out = fn(db);
  persist(db);
  return out;
}

// ================= 设备 =================

export function listEquipment(): Equipment[] {
  return [...load().equipment].sort((a, b) => a.name.localeCompare(b.name, "zh"));
}
export function getEquipment(id: string): Equipment | undefined {
  return load().equipment.find((e) => e.id === id);
}

export interface EquipmentInput {
  name: string;
  category?: string;
  total?: number;
  inUse?: number;
  loaned?: number;
  remark?: string;
}

/** 部分字段合并 + 一致性钳制（inUse+loaned<=total） */
function mergeEq(existing: Equipment, input: EquipmentInput): Equipment {
  const total = input.total !== undefined ? Math.max(0, Math.floor(input.total)) : existing.total;
  let inUse = input.inUse !== undefined ? Math.max(0, Math.floor(input.inUse)) : existing.inUse;
  let loaned = input.loaned !== undefined ? Math.max(0, Math.floor(input.loaned)) : existing.loaned;
  inUse = Math.min(inUse, total);
  loaned = Math.min(loaned, Math.max(0, total - inUse));
  return {
    ...existing,
    name: (input.name ?? existing.name).trim(),
    category: (input.category ?? existing.category).trim() || "未分类",
    total,
    inUse,
    loaned,
    remark: (input.remark ?? existing.remark).trim(),
    updatedAt: nowISO(),
  };
}

export function addEquipment(input: EquipmentInput): Equipment {
  const eq: Equipment = mergeEq(
    {
      id: uid(), name: "", category: "未分类", total: 0, inUse: 0, loaned: 0,
      remark: "", createdAt: nowISO(), updatedAt: nowISO(),
    },
    input
  );
  mutate((db) => {
    db.equipment.push(eq);
  });
  return eq;
}

export function updateEquipment(id: string, input: EquipmentInput): Equipment | null {
  return mutate((db) => {
    const idx = db.equipment.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    db.equipment[idx] = mergeEq(db.equipment[idx], input);
    return db.equipment[idx];
  });
}

/** 删除设备：存在未归还借出记录时禁止 */
export function deleteEquipment(id: string): { ok: boolean; reason?: string } {
  return mutate((db) => {
    const eq = db.equipment.find((e) => e.id === id);
    if (!eq) return { ok: false, reason: "设备不存在" };
    const active = db.borrows.some((b) => b.equipmentId === id && b.status === "approved");
    if (active) return { ok: false, reason: "该设备存在未归还的借出记录，请先全部归还" };
    db.equipment = db.equipment.filter((e) => e.id !== id);
    return { ok: true };
  });
}

// ================= 借用登记 =================

export function listBorrows(): BorrowRecord[] {
  return [...load().borrows].sort((a, b) => b.applyAt.localeCompare(a.applyAt));
}

export interface BorrowInput {
  student: string;
  className: string;
  equipmentId: string;
  quantity: number;
  reason?: string;
}

export function addBorrow(input: BorrowInput): { ok: boolean; borrow?: BorrowRecord; error?: string } {
  const eq = getEquipment(input.equipmentId);
  if (!eq) return { ok: false, error: "所选设备不存在" };
  const qty = Math.max(1, Math.floor(input.quantity));
  return mutate((db) => {
    const b: BorrowRecord = {
      id: uid(),
      student: input.student.trim(),
      className: input.className.trim(),
      equipmentId: eq.id,
      equipmentName: eq.name,
      quantity: qty,
      reason: (input.reason ?? "").trim(),
      applyAt: nowISO(),
      status: "pending",
    };
    db.borrows.push(b);
    return { ok: true, borrow: b };
  });
}

export function updateBorrow(id: string, input: BorrowInput): { ok: boolean; error?: string } {
  return mutate((db) => {
    const b = db.borrows.find((x) => x.id === id);
    if (!b) return { ok: false, error: "记录不存在" };
    if (b.status !== "pending") return { ok: false, error: "仅待审批的申请可修改" };
    const eq = db.equipment.find((e) => e.id === input.equipmentId);
    if (!eq) return { ok: false, error: "所选设备不存在" };
    b.student = input.student.trim();
    b.className = input.className.trim();
    b.equipmentId = eq.id;
    b.equipmentName = eq.name;
    b.quantity = Math.max(1, Math.floor(input.quantity));
    b.reason = (input.reason ?? "").trim();
    return { ok: true };
  });
}

/** 批准：扣减设备可用数量（借出数增加） */
export function approveBorrow(id: string): { ok: boolean; error?: string } {
  return mutate((db) => {
    const b = db.borrows.find((x) => x.id === id);
    if (!b) return { ok: false, error: "记录不存在" };
    if (b.status !== "pending") return { ok: false, error: "该申请已处理" };
    const eq = db.equipment.find((e) => e.id === b.equipmentId);
    if (!eq) return { ok: false, error: "关联设备已不存在，无法批准" };
    const avail = Math.max(0, eq.total - eq.inUse - eq.loaned);
    if (avail < b.quantity)
      return { ok: false, error: `设备「${eq.name}」当前仅剩 ${avail} 件可借，不足以批准 ${b.quantity} 件` };
    eq.loaned += b.quantity;
    eq.updatedAt = nowISO();
    b.status = "approved";
    b.approveAt = nowISO();
    b.rejectReason = undefined;
    return { ok: true };
  });
}

export function rejectBorrow(id: string, reason?: string): { ok: boolean; error?: string } {
  return mutate((db) => {
    const b = db.borrows.find((x) => x.id === id);
    if (!b) return { ok: false, error: "记录不存在" };
    if (b.status !== "pending") return { ok: false, error: "该申请已处理" };
    b.status = "rejected";
    b.rejectReason = (reason ?? "").trim();
    return { ok: true };
  });
}

/** 归还：恢复设备可用数量 */
export function returnBorrow(id: string): { ok: boolean; error?: string } {
  return mutate((db) => {
    const b = db.borrows.find((x) => x.id === id);
    if (!b) return { ok: false, error: "记录不存在" };
    if (b.status !== "approved") return { ok: false, error: "仅借用中的记录可归还" };
    const eq = db.equipment.find((e) => e.id === b.equipmentId);
    if (eq) {
      eq.loaned = Math.max(0, eq.loaned - b.quantity);
      eq.updatedAt = nowISO();
    }
    b.status = "returned";
    b.returnedAt = nowISO();
    return { ok: true };
  });
}

export function deleteBorrow(id: string): void {
  mutate((db) => {
    db.borrows = db.borrows.filter((x) => x.id !== id);
  });
}

// ================= 3D 打印 =================

export function listPrints(): PrintOrder[] {
  return [...load().prints].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface PrintInput {
  student: string;
  className: string;
  phone?: string;
  content: string;
  quantity: number;
  material: string;
  note?: string;
}

export function addPrint(input: PrintInput): PrintOrder {
  const p: PrintOrder = {
    id: uid(),
    student: input.student.trim(),
    className: input.className.trim(),
    phone: (input.phone ?? "").trim() || undefined,
    content: input.content.trim(),
    quantity: Math.max(1, Math.floor(input.quantity)),
    material: input.material || "PLA",
    note: (input.note ?? "").trim() || undefined,
    status: "pending",
    createdAt: nowISO(),
  };
  mutate((db) => {
    db.prints.push(p);
  });
  return p;
}

export type PrintAction = "start" | "finish" | "deliver" | "reject";

export function actPrint(id: string, action: PrintAction, reason?: string): { ok: boolean; error?: string } {
  return mutate((db) => {
    const p = db.prints.find((x) => x.id === id);
    if (!p) return { ok: false, error: "工单不存在" };
    const t = nowISO();
    switch (action) {
      case "start":
        if (p.status !== "pending") return { ok: false, error: "仅待接单工单可开始打印" };
        p.status = "printing";
        p.startAt = t;
        break;
      case "finish":
        if (p.status !== "printing") return { ok: false, error: "仅打印中的工单可标记完成" };
        p.status = "done";
        p.finishAt = t;
        break;
      case "deliver":
        if (p.status !== "done") return { ok: false, error: "仅已完成工单可确认交付" };
        p.status = "delivered";
        p.deliverAt = t;
        break;
      case "reject":
        if (p.status !== "pending") return { ok: false, error: "仅待接单工单可拒绝" };
        p.status = "rejected";
        p.rejectReason = (reason ?? "").trim();
        break;
    }
    return { ok: true };
  });
}

export function deletePrint(id: string): void {
  mutate((db) => {
    db.prints = db.prints.filter((x) => x.id !== id);
  });
}

export function getStats() {
  const db = load();
  const eqs = db.equipment;
  const total = eqs.reduce((s, e) => s + e.total, 0);
  const inUse = eqs.reduce((s, e) => s + e.inUse, 0);
  const loaned = eqs.reduce((s, e) => s + e.loaned, 0);
  const available = total - inUse - loaned;
  return {
    equipment: { kinds: eqs.length, total, inUse, loaned, available },
    borrows: {
      pending: db.borrows.filter((b) => b.status === "pending").length,
      active: db.borrows.filter((b) => b.status === "approved").length,
      returned: db.borrows.filter((b) => b.status === "returned").length,
      rejected: db.borrows.filter((b) => b.status === "rejected").length,
    },
    prints: {
      pending: db.prints.filter((p) => p.status === "pending").length,
      printing: db.prints.filter((p) => p.status === "printing").length,
      done: db.prints.filter((p) => p.status === "done").length,
      delivered: db.prints.filter((p) => p.status === "delivered").length,
      rejected: db.prints.filter((p) => p.status === "rejected").length,
    },
  };
}
