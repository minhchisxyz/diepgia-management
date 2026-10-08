import { LoaiVatTu } from "@prisma/client"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ ms: string }> }
const loaiVatTuValues = Object.values(LoaiVatTu)

function isPrismaError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}

async function update(request: Request, { params }: RouteContext) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const { ms } = await params
  const body = await request.json() as { ten?: unknown; loai?: unknown; mskh?: unknown }
  if (
    typeof body.ten !== "string" ||
    typeof body.loai !== "string" ||
    typeof body.mskh !== "string" ||
    !loaiVatTuValues.includes(body.ten as LoaiVatTu) ||
    !body.loai.trim() ||
    !body.mskh.trim()
  ) {
    return NextResponse.json({ error: "Dữ liệu vật tư không hợp lệ" }, { status: 400 })
  }
  try {
    const vatTu = await prisma.vatTu.update({
      where: { ms },
      data: { ten: body.ten as LoaiVatTu, loai: body.loai.trim(), mskh: body.mskh.trim() },
      include: { khachHang: true },
    })
    return NextResponse.json(vatTu)
  } catch (error) {
    if (isPrismaError(error, "P2003")) return NextResponse.json({ error: "Mã khách hàng không tồn tại" }, { status: 400 })
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy vật tư" }, { status: 404 })
    throw error
  }
}

export const PUT = update
export const PATCH = update

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  try {
    await prisma.vatTu.delete({ where: { ms: (await params).ms } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy vật tư" }, { status: 404 })
    if (isPrismaError(error, "P2003")) return NextResponse.json({ error: "Không thể xóa vật tư vì đang được tham chiếu" }, { status: 409 })
    throw error
  }
}
