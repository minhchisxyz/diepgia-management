import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

function isPrismaError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}

async function update(request: Request, { params }: RouteContext) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { ten?: unknown; donVi?: unknown }
  if (typeof body.ten !== "string" || typeof body.donVi !== "string" || !body.ten.trim() || !body.donVi.trim()) {
    return NextResponse.json({ error: "Tên và đơn vị là bắt buộc" }, { status: 400 })
  }
  try {
    const ingredient = await prisma.nguyenLieu.update({
      where: { id: (await params).id },
      data: { ten: body.ten.trim(), donVi: body.donVi.trim() },
    })
    return NextResponse.json(ingredient)
  } catch (error) {
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy nguyên liệu" }, { status: 404 })
    throw error
  }
}

export const PUT = update
export const PATCH = update

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  try {
    await prisma.nguyenLieu.delete({ where: { id: (await params).id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isPrismaError(error, "P2003")) return NextResponse.json({ error: "Không thể xóa nguyên liệu vì đang được dùng trong công thức" }, { status: 409 })
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy nguyên liệu" }, { status: 404 })
    throw error
  }
}
