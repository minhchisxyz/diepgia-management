'use server'

import {LoaiVatTu, Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/app/actions/users/data";
import {fail} from "@/lib/utils";

export async function listVatTu(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.VatTuWhereInput | undefined = query
      ? { ms: { contains: query, mode: `insensitive` } }
      : undefined

  const [items, total] = await Promise.all([
    prisma.vatTu.findMany({
      where,
      include: { gia: { orderBy: { ngay: `desc` }, take: 1 } },
      orderBy: { ms: `asc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vatTu.count({ where }),
  ])

  return {
    items: items.map(({ gia, ...item }) => ({
      ...item,
      donGia: gia[0]?.donGia.toString() ?? null,
    })),
    total,
  }
}

export async function createVatTu(data: {
  ms: string
  ten: LoaiVatTu
}) {
  await requireSession()

  try {
    const result = await prisma.vatTu.create({
      data,
    })

    revalidatePath(`/vat-tu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateVatTu(
    ms: string,
    data: { ten: LoaiVatTu; kho: number },
) {
  await requireSession()

  try {
    if (!Number.isInteger(data.kho) || data.kho < 0) return { error: `Kho phải là số nguyên không âm` }
    const result = await prisma.vatTu.update({
      where: { ms },
      data,
    })

    revalidatePath(`/vat-tu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteVatTu(ms: string) {
  await requireSession()

  try {
    await prisma.vatTu.delete({ where: { ms } })
    revalidatePath(`/vat-tu`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function saveVatTuPrice(
    ms: string,
    ngay: string,
    donGia: number,
) {
  await requireSession()

  if (!Number.isInteger(donGia) || donGia < 0) {
    return { error: `Đơn giá phải là số nguyên không âm` }
  }

  try {
    const date = new Date(`${ngay}T00:00:00Z`)
    const result = await prisma.vatTuDonGia.upsert({
      where: { ms_ngay: { ms, ngay: date } },
      create: { ms, ngay: date, donGia },
      update: { donGia },
    })

    revalidatePath(`/vat-tu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function listVatTuPrices(ms: string) {
  await requireSession()

  const prices = await prisma.vatTuDonGia.findMany({
    where: { ms },
    orderBy: { ngay: `desc` },
  })

  return prices.map((price) => ({
    ...price,
    ngay: price.ngay.toISOString(),
    donGia: price.donGia.toString(),
  }))
}

export async function deleteVatTuPrice(ms: string, ngay: string) {
  await requireSession()

  try {
    const date = new Date(`${ngay}T00:00:00Z`)
    await prisma.vatTuDonGia.delete({
      where: { ms_ngay: { ms, ngay: date } },
    })

    revalidatePath(`/vat-tu`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}