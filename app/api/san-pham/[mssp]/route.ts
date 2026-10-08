import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ mssp: string }> }

function isPrismaError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}

async function update(request: Request, { params }: RouteContext) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { mskh?: unknown; congThucId?: unknown }
  if (
    typeof body.mskh !== "string" ||
    typeof body.congThucId !== "string" ||
    !body.mskh.trim() ||
    !body.congThucId.trim()
  ) {
    return NextResponse.json({ error: "Khách hàng và công thức là bắt buộc" }, { status: 400 })
  }
  try {
    const product = await prisma.sanPham.update({
      where: { mssp: (await params).mssp },
      data: { mskh: body.mskh.trim(), congThucId: body.congThucId.trim() },
      include: { khachHang: true, congThuc: { include: { nguyenLieu: { include: { nguyenLieu: true } } } } },
    })
    return NextResponse.json(product)
  } catch (error) {
    if (isPrismaError(error, "P2002")) return NextResponse.json({ error: "Công thức đã được gán cho sản phẩm khác" }, { status: 409 })
    if (isPrismaError(error, "P2003")) return NextResponse.json({ error: "Khách hàng hoặc công thức không tồn tại" }, { status: 400 })
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    throw error
  }
}

export const PUT = update
export const PATCH = update

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  try {
    await prisma.sanPham.delete({ where: { mssp: (await params).mssp } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 })
    if (isPrismaError(error, "P2003")) return NextResponse.json({ error: "Không thể xóa sản phẩm vì đang được tham chiếu" }, { status: 409 })
    throw error
  }
}
