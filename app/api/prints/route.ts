import { NextResponse } from "next/server";
import { addPrint, listPrints, type PrintInput } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listPrints());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<PrintInput>;
  if (!body.student?.trim()) return NextResponse.json({ error: "请填写学生姓名" }, { status: 400 });
  if (!body.className?.trim()) return NextResponse.json({ error: "请填写班级" }, { status: 400 });
  if (!body.content?.trim()) return NextResponse.json({ error: "请描述打印需求" }, { status: 400 });
  const qty = Number(body.quantity);
  if (!qty || qty < 1) return NextResponse.json({ error: "打印数量至少为 1" }, { status: 400 });

  const p = addPrint({
    student: String(body.student),
    className: String(body.className),
    phone: body.phone ? String(body.phone) : undefined,
    content: String(body.content),
    quantity: qty,
    material: String(body.material || "PLA"),
    note: body.note ? String(body.note) : undefined,
  });
  return NextResponse.json(p, { status: 201 });
}
