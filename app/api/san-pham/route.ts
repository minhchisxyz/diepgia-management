import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  return NextResponse.json(await prisma.sanPham.findMany({
    include: {
      khachHang: { select: { mskh: true, ten: true } },
      nguyenLieu: { include: { nguyenLieu: true } },
    },
    orderBy: { mssp: "asc" },
  }))
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { mssp?: unknown; mskh?: unknown; tenThuongMai?: unknown; tenPhanBon?: unknown; quyCach?: unknown; quyCachThung?: unknown; donGia?: unknown; nguyenLieu?: unknown }
  if (
    typeof body.mssp !== "string" ||
    typeof body.mskh !== "string" ||
    typeof body.tenThuongMai !== "string" ||
    typeof body.tenPhanBon !== "string" ||
    typeof body.quyCach !== "string" ||
    typeof body.quyCachThung !== "string" ||
    typeof body.donGia !== "number" ||
    !Array.isArray(body.nguyenLieu) ||
    !body.mssp.trim() ||
    !body.mskh.trim() ||
    !body.tenThuongMai.trim() ||
    !body.tenPhanBon.trim() ||
    !body.quyCach.trim() ||
    !body.quyCachThung.trim() ||
    !Number.isFinite(body.donGia) ||
    body.donGia < 0 ||
    body.nguyenLieu.length === 0
  ) {
    return NextResponse.json({ error: "Thông tin sản phẩm và ít nhất một nguyên liệu là bắt buộc" }, { status: 400 })
  }

  try {
    const ingredients = body.nguyenLieu as { nguyenLieuId?: unknown; giaTri?: unknown }[]
    if (ingredients.some((item) => typeof item.nguyenLieuId !== "string" || typeof item.giaTri !== "number" || !Number.isFinite(item.giaTri) || item.giaTri <= 0)) {
      return NextResponse.json({ error: "Nguyên liệu và định lượng không hợp lệ" }, { status: 400 })
    }
    const product = await prisma.sanPham.create({
      data: {
        mssp: body.mssp.trim(),
        mskh: body.mskh.trim(),
        tenThuongMai: body.tenThuongMai.trim(),
        tenPhanBon: body.tenPhanBon.trim(),
        quyCach: body.quyCach.trim(),
        quyCachThung: body.quyCachThung.trim(),
        donGia: body.donGia,
        nguyenLieu: { create: ingredients.map((item) => ({ nguyenLieuId: item.nguyenLieuId as string, giaTri: item.giaTri as number })) },
      },
      include: { khachHang: true, nguyenLieu: { include: { nguyenLieu: true } } },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") return NextResponse.json({ error: "Mã sản phẩm đã được sử dụng" }, { status: 409 })
      if (error.code === "P2003") return NextResponse.json({ error: "Khách hàng hoặc nguyên liệu không tồn tại" }, { status: 400 })
    }
    throw error
  }
}
