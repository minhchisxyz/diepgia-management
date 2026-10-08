import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ mskh: string }> }

function isPrismaError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}

function parseCustomer(body: unknown) {
  if (typeof body !== "object" || body === null) return null
  const data = body as Record<string, unknown>
  const fields = ["ten", "diaChi", "tinh"] as const
  if (fields.some((field) => typeof data[field] !== "string" || !data[field].trim())) return null
  for (const field of ["tenCongTy", "email", "maSoThue", "soDienThoai"]) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== "string") return null
  }
  return {
    ten: (data.ten as string).trim(),
    diaChi: (data.diaChi as string).trim(),
    tinh: (data.tinh as string).trim(),
    tenCongTy: typeof data.tenCongTy === "string" ? data.tenCongTy.trim() || null : null,
    email: typeof data.email === "string" ? data.email.trim() || null : null,
    maSoThue: typeof data.maSoThue === "string" ? data.maSoThue.trim() || null : null,
    soDienThoai: typeof data.soDienThoai === "string" ? data.soDienThoai.trim() || null : null,
  }
}

async function update(request: Request, { params }: RouteContext) {
  if (!await getSession()) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  }
  const { mskh } = await params
  const data = parseCustomer(await request.json())
  if (!data) {
    return NextResponse.json({ error: "Tên, địa chỉ và tỉnh là bắt buộc" }, { status: 400 })
  }
  try {
    const customer = await prisma.khachHang.update({ where: { mskh }, data })
    return NextResponse.json(customer)
  } catch (error) {
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy khách hàng" }, { status: 404 })
    throw error
  }
}

export const PUT = update
export const PATCH = update

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!await getSession()) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  }
  const { mskh } = await params
  try {
    await prisma.khachHang.delete({ where: { mskh } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isPrismaError(error, "P2003")) {
      return NextResponse.json({ error: "Không thể xóa khách hàng vì đang được vật tư hoặc sản phẩm sử dụng" }, { status: 409 })
    }
    if (isPrismaError(error, "P2025")) return NextResponse.json({ error: "Không tìm thấy khách hàng" }, { status: 404 })
    throw error
  }
}
