'use server'

import { LoaiHangNhap, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/actions/users/data"
import { fail } from "@/lib/utils"

export async function nhapHang(
  loai: LoaiHangNhap,
  maHangNhap: string,
  soLuong: number,
  donGia: number,
) {
  await requireSession()

  try {
    const result = await prisma.nhapHang.create({
      data: {
        loai,
        maHangNhap,
        soLuong,
        donGia,
        tongTien: soLuong * donGia,
      },
    })
    revalidatePath(`/nhap-hang`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function listNhapHang(search = ``, page?: number, pageSize?: number) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.NhapHangWhereInput | undefined = query
    ? {
        maHangNhap: { contains: query, mode: `insensitive` },
      }
    : undefined

  const [items, total] = await Promise.all([
    prisma.nhapHang.findMany({
      where,
      orderBy: { ngayNhap: `desc` },
      ...(pageSize ? { skip: ((page ?? 1) - 1) * pageSize, take: pageSize } : {}),
    }),
    prisma.nhapHang.count({ where }),
  ])

  return {
    items: items.map((item) => ({
      ...item,
      ngayNhap: item.ngayNhap.toISOString(),
    })),
    total,
  }
}
