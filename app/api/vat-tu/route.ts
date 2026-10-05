import { LoaiVatTu } from "@prisma/client"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const loaiVatTuValues = Object.values(LoaiVatTu)

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  }

  const search = new URL(request.url).searchParams.get("mskh")?.trim() ?? ""
  const vatTus = await prisma.vatTu.findMany({
    where: search ? { mskh: { contains: search, mode: "insensitive" } } : undefined,
    include: { khachHang: true },
    orderBy: { ms: "asc" },
  })

  return NextResponse.json(vatTus)
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
    typeof (body as Record<string, unknown>).ms !== "string" ||
    typeof (body as Record<string, unknown>).ten !== "string" ||
    typeof (body as Record<string, unknown>).loai !== "string" ||
    typeof (body as Record<string, unknown>).mskh !== "string"
  ) {
    return NextResponse.json({ error: "Mã, tên, loại và mã khách hàng là bắt buộc" }, { status: 400 })
  }

  const data = body as { ms: string; ten: string; loai: string; mskh: string }
  const ms = data.ms.trim()
  const loai = data.loai.trim()
  const mskh = data.mskh.trim()
  if (!ms || !loai || !mskh || !loaiVatTuValues.includes(data.ten as LoaiVatTu)) {
    return NextResponse.json({ error: "Dữ liệu vật tư không hợp lệ" }, { status: 400 })
  }

  try {
    const vatTu = await prisma.vatTu.create({
      data: { ms, ten: data.ten as LoaiVatTu, loai, mskh },
      include: { khachHang: true },
    })
    return NextResponse.json(vatTu, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Mã vật tư đã tồn tại" }, { status: 409 })
      }
      if (error.code === "P2003") {
        return NextResponse.json({ error: "Mã khách hàng không tồn tại" }, { status: 400 })
      }
    }
    throw error
  }
}
