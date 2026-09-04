import { NextResponse } from "next/server";
import { addEquipment, listEquipment, updateEquipment, type EquipmentInput } from "@/lib/store";

/**
 * CSV 批量导入。body: { rows: ImportRow[], mode: "update" | "skip" | "add" }
 * 列名映射在浏览器端完成（见 lib/csv.ts），服务端只做落库。
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const mode = ["update", "skip", "add"].includes(body.mode) ? body.mode : "update";
  if (rows.length === 0) return NextResponse.json({ error: "没有可导入的数据行" }, { status: 400 });

  const existing = new Map(listEquipment().map((e) => [e.name.trim(), e]));
  const addedNames = new Set<string>();
  let added = 0, updated = 0, skipped = 0;
  const issues: string[] = [];

  for (const r of rows as (EquipmentInput & { srcLine?: number })[]) {
    const name = String(r.name ?? "").trim();
    if (!name) {
      if (r.srcLine) issues.push(`第 ${r.srcLine} 行缺少设备名称，已跳过`);
      else skipped++;
      continue;
    }
    const line = r.srcLine ? `第 ${r.srcLine} 行「${name}」：` : `「${name}」：`;
    const prev = existing.get(name);
    const clean: EquipmentInput = {
      name,
      category: r.category,
      total: r.total,
      inUse: r.inUse,
      loaned: r.loaned,
      remark: r.remark,
    };

    if (mode === "add") {
      if (prev || addedNames.has(name)) {
        skipped++;
        issues.push(`${line}与${prev ? "现有" : "本次文件内"}设备重名，已跳过（如需更新请改用「更新同名」模式）`);
        continue;
      }
      addEquipment(clean);
      addedNames.add(name);
      added++;
    } else if (prev) {
      if (mode === "skip") {
        skipped++;
        issues.push(`${line}已存在，已跳过`);
        continue;
      }
      updateEquipment(prev.id, clean);
      updated++;
    } else {
      addEquipment(clean);
      addedNames.add(name);
      added++;
    }
  }

  return NextResponse.json({
    ok: true,
    added,
    updated,
    skipped,
    mode,
    issues: issues.slice(0, 8),
  });
}
