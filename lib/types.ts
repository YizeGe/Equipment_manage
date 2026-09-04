// ============ 数据类型定义（前后端共用） ============

/** 设备台账 */
export interface Equipment {
  id: string;
  name: string;        // 设备名称
  category: string;    // 分类（摄影 / 创客 / 电子设备…）
  total: number;       // 总数
  inUse: number;       // 在用（学校内部占用）
  loaned: number;      // 借出（学生借出中，由借用系统自动增减）
  remark: string;      // 备注
  createdAt: string;
  updatedAt: string;
}

/** 设备派生视图 */
export type EqStatusKey = "idle" | "inuse" | "loaned" | "partial" | "empty";

export interface EquipmentView extends Equipment {
  available: number; // 剩余 / 空闲 = total - inUse - loaned
  statusKey: EqStatusKey;
}

/** 借用状态：待审批 -> 借用中 -> 已归还（/ 已拒绝） */
export type BorrowStatus = "pending" | "approved" | "returned" | "rejected";

export interface BorrowRecord {
  id: string;
  student: string;     // 学生姓名
  className: string;   // 班级
  equipmentId: string;
  equipmentName: string; // 设备名称快照
  quantity: number;
  reason: string;      // 借用用途
  applyAt: string;     // 申请时间
  approveAt?: string;
  returnedAt?: string;
  rejectReason?: string;
  status: BorrowStatus;
}

/** 3D 打印工单状态：待接单 -> 打印中 -> 打印完成(待交付) -> 已交付 */
export type PrintStatus = "pending" | "printing" | "done" | "delivered" | "rejected";

export interface PrintOrder {
  id: string;
  student: string;
  className: string;
  phone?: string;
  content: string;     // 打印需求描述
  quantity: number;
  material: string;    // 材料
  note?: string;
  status: PrintStatus;
  createdAt: string;
  startAt?: string;
  finishAt?: string;
  deliverAt?: string;
  rejectReason?: string;
}

// ============ 元信息（徽标 / 文案） ============

export interface ToneMeta {
  label: string;
  tone: string; // tailwind 色键
  dot?: boolean;
}

export const eqStatusMeta: Record<EqStatusKey, ToneMeta> = {
  idle: { label: "空闲", tone: "emerald" },
  inuse: { label: "全部在用", tone: "sky" },
  loaned: { label: "全部借出", tone: "amber" },
  partial: { label: "部分占用", tone: "violet" },
  empty: { label: "无库存", tone: "slate" },
};

export const borrowStatusMeta: Record<BorrowStatus, ToneMeta> = {
  pending: { label: "待审批", tone: "amber", dot: true },
  approved: { label: "借用中", tone: "sky", dot: true },
  returned: { label: "已归还", tone: "emerald" },
  rejected: { label: "已拒绝", tone: "rose" },
};

export const printStatusMeta: Record<PrintStatus, ToneMeta> = {
  pending: { label: "待接单", tone: "violet", dot: true },
  printing: { label: "打印中", tone: "sky", dot: true },
  done: { label: "待交付", tone: "amber", dot: true },
  delivered: { label: "已交付", tone: "emerald" },
  rejected: { label: "已拒绝", tone: "rose" },
};

export const MATERIALS = ["PLA", "PETG", "TPU", "ABS", "光敏树脂", "其他"] as const;

// ============ 派生计算（前后端共用） ============

export function availableOf(e: Equipment): number {
  return Math.max(0, e.total - e.inUse - e.loaned);
}

export function statusKeyOf(e: Equipment): EqStatusKey {
  const { total, inUse, loaned } = e;
  if (total <= 0) return "empty";
  const avail = Math.max(0, total - inUse - loaned);
  if (inUse <= 0 && loaned <= 0) return "idle";
  if (avail <= 0) {
    if (inUse > 0 && loaned <= 0) return "inuse";
    if (loaned > 0 && inUse <= 0) return "loaned";
    return "partial";
  }
  return "partial";
}

export function toView(e: Equipment): EquipmentView {
  return { ...e, available: availableOf(e), statusKey: statusKeyOf(e) };
}

export const nowISO = () => new Date().toISOString();

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
