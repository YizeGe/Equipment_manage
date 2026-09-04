import { NextResponse } from "next/server";
import { addEquipment, listEquipment } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listEquipment());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name } = body as { name?: string };
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "设备名称不能为空" }, { status: 400 });
  }
  const eq = addEquipment(body);
  return NextResponse.json(eq, { status: 201 });
}
