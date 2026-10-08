import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  return NextResponse.json(await prisma.sanPham.findMany({
    include: {
      khachHang: { select: { mskh: true, ten: true } },
      congThuc: { select: { id: true, nguyenLieu: { include: { nguyenLieu: true } } } },
    },
    orderBy: { mssp: "asc" },
  }))
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { mssp?: unknown; mskh?: unknown; congThucId?: unknown }
  if (
    typeof body.mssp !== "string" ||
    typeof body.mskh !== "string" ||
    typeof body.congThucId !== "string" ||
    !body.mssp.trim() ||
    !body.mskh.trim() ||
    !body.congThucId.trim()
  ) {
    return NextResponse.json({ error: "Mã sản phẩm, khách hàng và công thức là bắt buộc" }, { status: 400 })
  }

  try {
    const product = await prisma.sanPham.create({
      data: { mssp: body.mssp.trim(), mskh: body.mskh.trim(), congThucId: body.congThucId.trim() },
      include: { khachHang: true, congThuc: { include: { nguyenLieu: { include: { nguyenLieu: true } } } } },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") return NextResponse.json({ error: "Mã sản phẩm hoặc công thức đã được sử dụng" }, { status: 409 })
      if (error.code === "P2003") return NextResponse.json({ error: "Khách hàng hoặc công thức không tồn tại" }, { status: 400 })
    }
    throw error
  }
}
