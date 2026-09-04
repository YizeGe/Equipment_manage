import { NextResponse } from "next/server";
import { actPrint, deletePrint, type PrintAction } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

/** body: { action: "start"|"finish"|"deliver"|"reject", reason? } */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: PrintAction; reason?: string };
  if (!body.action) return NextResponse.json({ error: "缺少操作类型" }, { status: 400 });
  const res = actPrint(id, body.action, body.reason);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  deletePrint(id);
  return NextResponse.json({ ok: true });
}
