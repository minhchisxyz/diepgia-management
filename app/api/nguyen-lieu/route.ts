import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const selectedDate = new Date(`${new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10)}T23:59:59.999Z`)
  const ingredients = await prisma.nguyenLieu.findMany({ orderBy: { ten: "asc" } })
  const prices = await prisma.nguyenLieuDonGia.findMany({
    where: { ngay: { lte: selectedDate } },
    orderBy: { ngay: "desc" },
  })
  return NextResponse.json(ingredients.map((ingredient) => ({
    ...ingredient,
    donGia: prices.find((price) => price.nguyenLieuId === ingredient.id)?.donGia ?? null,
  })))
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { ten?: unknown; donVi?: unknown; loai?: unknown }
  if (typeof body.ten !== "string" || typeof body.donVi !== "string" || typeof body.loai !== "string" || !body.ten.trim() || !body.donVi.trim() || !body.loai.trim()) {
    return NextResponse.json({ error: "Tên, đơn vị và loại là bắt buộc" }, { status: 400 })
  }
  return NextResponse.json(
    await prisma.nguyenLieu.create({ data: { ten: body.ten.trim(), donVi: body.donVi.trim(), loai: body.loai.trim() } }),
    { status: 201 },
  )
}
