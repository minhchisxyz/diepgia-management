import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  }

  const search = new URL(request.url).searchParams.get("search")?.trim() ?? ""
  const khachHangs = await prisma.khachHang.findMany({
    where: search ? { mskh: { contains: search, mode: "insensitive" } } : undefined,
    orderBy: { mskh: "asc" },
  })

  return NextResponse.json(khachHangs)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).mskh !== "string" ||
    typeof (body as Record<string, unknown>).ten !== "string" ||
    typeof (body as Record<string, unknown>).diaChi !== "string" ||
    typeof (body as Record<string, unknown>).tinh !== "string" ||
    ((body as Record<string, unknown>).tenCongTy !== undefined &&
      typeof (body as Record<string, unknown>).tenCongTy !== "string") ||
    ((body as Record<string, unknown>).maSoThue !== undefined &&
      typeof (body as Record<string, unknown>).maSoThue !== "string") ||
    ((body as Record<string, unknown>).soDienThoai !== undefined &&
      typeof (body as Record<string, unknown>).soDienThoai !== "string") ||
    ((body as Record<string, unknown>).email !== undefined &&
      typeof (body as Record<string, unknown>).email !== "string")
  ) {
    return NextResponse.json(
      { error: "Mã khách hàng, tên, địa chỉ và tỉnh là bắt buộc" },
      { status: 400 },
    )
  }

  const data = body as {
    mskh: string
    ten: string
    tenCongTy?: string
    diaChi: string
    tinh: string
    email?: string
    maSoThue?: string
    soDienThoai?: string
  }
  const mskh = data.mskh.trim()
  const ten = data.ten.trim()
  const tenCongTy = data.tenCongTy?.trim() || null
  const diaChi = data.diaChi.trim()
  const tinh = data.tinh.trim()
  const email = data.email?.trim() || null
  const maSoThue = data.maSoThue?.trim() || null
  const soDienThoai = data.soDienThoai?.trim() || null
  if (!mskh || !ten || !diaChi || !tinh) {
    return NextResponse.json(
      { error: "Mã khách hàng, tên, địa chỉ và tỉnh không được để trống" },
      { status: 400 },
    )
  }

  try {
    const khachHang = await prisma.khachHang.create({
      data: { mskh, ten, tenCongTy, diaChi, email, maSoThue, soDienThoai, tinh },
    })
    return NextResponse.json(khachHang, { status: 201 })
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Mã khách hàng đã tồn tại" }, { status: 409 })
    }
    throw error
  }
}
