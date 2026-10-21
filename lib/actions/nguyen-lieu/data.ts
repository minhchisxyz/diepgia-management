'use server'

import {LoaiHangNhap, Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/actions/users/data";
import {fail} from "@/lib/utils";
import {nhapHang} from "@/lib/actions/nhap-hang/data";

export async function listIngredients(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.NguyenLieuWhereInput | undefined = query
      ? { ten: { contains: query, mode: `insensitive` } }
      : undefined

  const [rows, total] = await Promise.all([
    prisma.nguyenLieu.findMany({
      where,
      include: { gia: { orderBy: { ngay: `desc` } } },
      orderBy: { ten: `asc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.nguyenLieu.count({ where }),
  ])

  const items = rows.map(({ gia, ...item }) => ({
    ...item,
    donGia: gia[0]?.donGia?.toString() ?? null,
    gia: gia.map((price) => ({
      ...price,
      ngay: price.ngay.toISOString(),
      donGia: price.donGia.toString(),
    })),
  }))

  return { items, total }
}

export async function createIngredient(data: {
  ten: string
  donVi: string
  loai: string
  kho?: number
}) {
  await requireSession()

  try {
    const kho = data.kho ?? 0
    if (!Number.isInteger(kho) || kho < 0) return { error: `Kho phải là số nguyên không âm` }
    const result = await prisma.nguyenLieu.create({ data: { ...data, kho } })
    revalidatePath(`/nguyen-lieu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateIngredient(
    id: string,
    data: { ten: string; donVi: string; loai: string; kho: number },
) {
  await requireSession()

  try {
    if (!Number.isInteger(data.kho) || data.kho < 0) return { error: `Kho phải là số nguyên không âm` }
    const result = await prisma.nguyenLieu.update({ where: { id }, data })
    revalidatePath(`/nguyen-lieu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteIngredient(id: string) {
  await requireSession()

  try {
    await prisma.nguyenLieu.delete({ where: { id } })
    revalidatePath(`/nguyen-lieu`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function saveIngredientPrice(
    nguyenLieuId: string,
    ngay: string,
    donGia: number,
) {
  await requireSession()

  try {
    const date = new Date(`${ngay}T00:00:00Z`)
    const result = await prisma.nguyenLieuDonGia.upsert({
      where: { nguyenLieuId_ngay: { nguyenLieuId, ngay: date } },
      create: { nguyenLieuId, ngay: date, donGia },
      update: { donGia },
    })

    revalidatePath(`/nguyen-lieu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteIngredientPrice(
    nguyenLieuId: string,
    ngay: string,
) {
  await requireSession()

  try {
    const date = new Date(`${ngay}T00:00:00Z`)
    await prisma.nguyenLieuDonGia.delete({
      where: { nguyenLieuId_ngay: { nguyenLieuId, ngay: date } },
    })

    revalidatePath(`/nguyen-lieu`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function listIngredientPrices(nguyenLieuId: string) {
  await requireSession()

  const prices = await prisma.nguyenLieuDonGia.findMany({
    where: { nguyenLieuId },
    orderBy: { ngay: `desc` },
  })

  return prices.map((price) => ({
    ...price,
    ngay: price.ngay.toISOString(),
    donGia: price.donGia.toString(),
  }))
}

export async function importIngredient(id: string, soLuong: number) {
  await requireSession()
  try {
    const ingredient = await prisma.nguyenLieu.findUnique({
      where: { id } ,
      include: { gia: { orderBy: { ngay: `desc` } } }
    })
    if (!ingredient) return { error: `Nguyên liệu không tồn tại` }
    if (!ingredient.gia.length) return { error: `Nguyên liệu không có giá` }
    await Promise.all([
      prisma.nguyenLieu.update({
        where: { id },
        data: { kho: {increment: soLuong} },
      }),
      nhapHang(LoaiHangNhap.NGUYEN_LIEU, ingredient.ten, soLuong, ingredient.gia[0]?.donGia ?? 0)
    ])
    revalidatePath(`/nguyen-lieu`)
  } catch (error) {
    return fail(error)
  }
}