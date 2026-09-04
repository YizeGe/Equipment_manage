import { NextResponse } from "next/server";
import { addBorrow, listBorrows, type BorrowInput } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listBorrows());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<BorrowInput>;
  if (!body.student?.trim()) return NextResponse.json({ error: "请填写学生姓名" }, { status: 400 });
  if (!body.className?.trim()) return NextResponse.json({ error: "请填写班级" }, { status: 400 });
  if (!body.equipmentId) return NextResponse.json({ error: "请选择借用设备" }, { status: 400 });
  const qty = Number(body.quantity);
  if (!qty || qty < 1) return NextResponse.json({ error: "借用数量至少为 1" }, { status: 400 });

  const res = addBorrow({
    student: String(body.student),
    className: String(body.className),
    equipmentId: String(body.equipmentId),
    quantity: qty,
    reason: body.reason ? String(body.reason) : undefined,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res.borrow, { status: 201 });
}
