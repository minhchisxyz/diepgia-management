import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const recipes = await prisma.congThuc.findMany({
    include: {
      nguyenLieu: { include: { nguyenLieu: true } },
      sanPham: { select: { mssp: true } },
    },
    orderBy: { id: "asc" },
  })
  return NextResponse.json(recipes)
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "Bạn cần đăng nhập để tiếp tục" }, { status: 401 })
  const body = await request.json() as { ingredients?: unknown }
  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    return NextResponse.json({ error: "Công thức cần ít nhất một nguyên liệu" }, { status: 400 })
  }

  const ingredients = body.ingredients as { nguyenLieuId?: unknown; giaTri?: unknown }[]
  if (ingredients.some((item) =>
    typeof item.nguyenLieuId !== "string" ||
    typeof item.giaTri !== "number" ||
    !Number.isFinite(item.giaTri) ||
    item.giaTri <= 0
  )) {
    return NextResponse.json({ error: "Nguyên liệu và giá trị phải hợp lệ" }, { status: 400 })
  }

  try {
    const recipe = await prisma.congThuc.create({
      data: {
        nguyenLieu: {
          create: ingredients.map((item) => ({
            nguyenLieuId: item.nguyenLieuId as string,
            giaTri: item.giaTri as number,
          })),
        },
      },
      include: { nguyenLieu: { include: { nguyenLieu: true } } },
    })
    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      return NextResponse.json({ error: "Nguyên liệu không tồn tại" }, { status: 400 })
    }
    throw error
  }
}
