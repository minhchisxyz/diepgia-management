'use server'

import {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/actions/users/data";
import {fail} from "@/lib/utils";

export async function listCustomers(search = ``, page?: number, pageSize?: number) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.KhachHangWhereInput | undefined = query
      ? {
        OR: [
          { mskh: { contains: query, mode: `insensitive` } },
          { ten: { contains: query, mode: `insensitive` } },
          { tenCongTy: { contains: query, mode: `insensitive` } },
        ],
      }
      : undefined

  const [items, total] = await Promise.all([
    prisma.khachHang.findMany({
      where,
      orderBy: { mskh: `asc` },
      ...(pageSize ? { skip: ((page ?? 1) - 1) * pageSize, take: pageSize } : {}),
    }),
    prisma.khachHang.count({ where }),
  ])

  return { items, total }
}

export async function getDiaChiGiaoHangForCustomer(mskh: string) {
  await requireSession()

  return await prisma.khachHang.findUnique({
    where: { mskh },
    select: { diaChiGiaoHang: true, sdtChanh: true },
  })
}

export async function createCustomer(data: Record<string, string | null>) {
  await requireSession()

  try {
    const result = await prisma.khachHang.create({
      data: {
        mskh: data.mskh?.trim() ?? ``,
        ten: data.ten?.trim() ?? ``,
        tenCongTy: data.tenCongTy?.trim() || null,
        diaChi: data.diaChi?.trim() ?? ``,
        tinh: data.tinh?.trim() ?? ``,
        email: data.email?.trim() || null,
        maSoThue: data.maSoThue?.trim() || null,
        soDienThoai: data.soDienThoai?.trim() || null,
        quanLyMskh: data.quanLyMskh?.trim() || null,
      },
    })

    revalidatePath(`/khach-hang`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateCustomer(
    id: string,
    data: Record<string, string | null>,
) {
  await requireSession()

  try {
    const updateData: Record<string, unknown> = {
      ...data,
      tenCongTy: data.tenCongTy || null,
      email: data.email || null,
      maSoThue: data.maSoThue || null,
      soDienThoai: data.soDienThoai || null,
    }

    if (data.quanLyMskh !== undefined) {
      updateData.quanLyMskh = data.quanLyMskh?.trim() || null
    }

    const result = await prisma.khachHang.update({
      where: { mskh: id },
      data: updateData,
    })

    revalidatePath(`/khach-hang`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function deleteCustomer(id: string) {
  await requireSession()

  try {
    await prisma.khachHang.delete({ where: { mskh: id } })
    revalidatePath(`/khach-hang`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}
