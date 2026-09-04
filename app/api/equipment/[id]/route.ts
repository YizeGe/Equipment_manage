import { NextResponse } from "next/server";
import { deleteEquipment, updateEquipment } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const eq = updateEquipment(id, body);
  if (!eq) return NextResponse.json({ error: "设备不存在" }, { status: 404 });
  return NextResponse.json(eq);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const res = deleteEquipment(id);
  if (!res.ok) return NextResponse.json({ error: res.reason ?? "删除失败" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
