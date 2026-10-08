import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  return NextResponse.json(await prisma.nguyenLieu.findMany({ orderBy: { ten: "asc" } }))
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { ten?: unknown; donVi?: unknown }
  if (typeof body.ten !== "string" || typeof body.donVi !== "string" || !body.ten.trim() || !body.donVi.trim()) {
    return NextResponse.json({ error: "Tên và đơn vị là bắt buộc" }, { status: 400 })
  }
  return NextResponse.json(
    await prisma.nguyenLieu.create({ data: { ten: body.ten.trim(), donVi: body.donVi.trim() } }),
    { status: 201 },
  )
}
