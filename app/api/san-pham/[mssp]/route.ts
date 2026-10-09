import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ mssp: string }> }

function isPrismaError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}

async function update(request: Request, { params }: RouteContext) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { mskh?: unknown; tenThuongMai?: unknown; tenSanPham?: unknown; quyCach?: unknown; quyCachThung?: unknown; donGia?: unknown; nguyenLieu?: unknown }
  if (
    typeof body.mskh !== "string" ||
    typeof body.tenThuongMai !== "string" ||
    typeof body.tenSanPham !== "string" ||
    typeof body.quyCach !== "string" ||
    typeof body.quyCachThung !== "string" ||
    typeof body.donGia !== "number" ||
    !Array.isArray(body.nguyenLieu) ||
    !body.mskh.trim() ||
    !body.tenThuongMai.trim() ||
    !body.tenSanPham.trim() ||
    !body.quyCach.trim() ||
    !body.quyCachThung.trim() ||
    !Number.isFinite(body.donGia) ||
    body.donGia < 0 ||
    body.nguyenLieu.length === 0
  ) {
    return NextResponse.json({ error: "Thông tin sản phẩm và nguyên liệu là bắt buộc" }, { status: 400 })
  }
  try {
    const ingredients = body.nguyenLieu as { nguyenLieuId?: unknown; giaTri?: unknown }[]
    if (ingredients.some((item) => typeof item.nguyenLieuId !== "string" || typeof item.giaTri !== "number" || !Number.isFinite(item.giaTri) || item.giaTri <= 0)) {
      return NextResponse.json({ error: "Nguyên liệu và định lượng không hợp lệ" }, { status: 400 })
    }
    const product = await prisma.sanPham.update({
      where: { mssp: (await params).mssp },
      data: {
        mskh: body.mskh.trim(),
        tenThuongMai: body.tenThuongMai.trim(),
        tenPhanBon: body.tenSanPham.trim(),
        quyCach: body.quyCach.trim(),
        quyCachThung: Number(body.quyCachThung.trim()),
        donGia: body.donGia,
        nguyenLieu: { deleteMany: {}, create: ingredients.map((item) => ({ nguyenLieuId: item.nguyenLieuId as string, giaTri: item.giaTri as number })) },
      },
      include: { khachHang: true, nguyenLieu: { include: { nguyenLieu: true } } },
    })
    return NextResponse.json(product)
  } catch (error) {
    if (isPrismaError(error, "P2003")) return NextResponse.json({ error: "Khách hàng hoặc nguyên liệu không tồn tại" }, { status: 400 })
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
