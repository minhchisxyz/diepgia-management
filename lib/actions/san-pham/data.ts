'use server'

import {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {requireSession} from "@/lib/actions/users/data";
import {revalidatePath} from "next/cache";
import {calculateKhoiLuong, fail} from "@/lib/utils";
import Excel from "@/lib/excel";

export async function listProducts(search = ``, page?: number, pageSize?: number, mskh?: string) {
  await requireSession()

  const query = search.trim()
  const customerCode = mskh?.trim() || undefined

  let customerCodes: string[] | undefined = undefined
  if (customerCode) {
    const customer = await prisma.khachHang.findUnique({
      where: { mskh: customerCode },
      select: { quanLyMskh: true },
    })
    customerCodes = customer?.quanLyMskh ? [customerCode, customer.quanLyMskh] : [customerCode]
  }

  const where: Prisma.SanPhamWhereInput | undefined = (query || customerCodes)
      ? {
          ...(query ? { mssp: { contains: query, mode: `insensitive` } } : {}),
          ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
        }
      : undefined

  const [rows, total] = await Promise.all([
    prisma.sanPham.findMany({
      where,
      include: {
        khachHang: { select: { mskh: true, ten: true } },
        nguyenLieu: {
          include: {
            nguyenLieu: {
              include: {
                gia: {
                  orderBy: { ngay: `desc` },
                  take: 1,
                },
              },
            },
          },
        },
        vatTu: {
          include: {
            vatTu: {
              include: {
                gia: {
                  orderBy: { ngay: `desc` },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { mssp: `asc` },
      ...(pageSize ? { skip: ((page ?? 1) - 1) * pageSize, take: pageSize } : {}),
    }),
    prisma.sanPham.count({ where }),
  ])

  const items = rows.map((row) => ({
    ...row,
    quyCachThung: String(row.quyCachThung),
    donGia: String(row.donGia),
    tiTrong: row.tiTrong != null ? row.tiTrong : null,
    nguyenLieu: row.nguyenLieu.map((item) => ({
      ...item,
      dinhLuong: item.dinhLuong.toString(),
      donGia: item.nguyenLieu.gia[0]?.donGia != null ? String(item.nguyenLieu.gia[0].donGia) : null,
    })),
    vatTu: row.vatTu.map((item) => ({
      ...item.vatTu,
      donGia: item.vatTu.gia[0]?.donGia != null ? String(item.vatTu.gia[0].donGia) : null,
    })),
  }))

  return { items, total }
}

export async function listProductsForCustomer(mskh: string) {
  await requireSession()

  const customer = await prisma.khachHang.findUnique({
    where: { mskh },
    select: { quanLyMskh: true },
  })

  const customerCodes = customer?.quanLyMskh ? [mskh, customer.quanLyMskh] : [mskh]

  return prisma.sanPham.findMany({
    where: { mskh: { in: customerCodes } },
    orderBy: { mssp: `asc` },
    select: {
      mssp: true,
      tenPhanBon: true,
      tenThuongMai: true,
      quyCach: true,
      quyCachThung: true,
      donGia: true,
      khoiLuong: true,
    },
  })
}

type ProductInput = {
  mssp: string
  mskh: string
  tenThuongMai?: string
  tenPhanBon?: string
  quyCach: string
  quyCachThung: number
  donGia: number
  tiTrong?: number | null
  nguyenLieu: { nguyenLieuId: string; dinhLuong: number }[]
  vatTu: string[]
}

export async function createProduct(data: ProductInput) {
  await requireSession()

  try {
    if (new Set(data.vatTu).size !== data.vatTu.length) {
      return { error: `Không được chọn trùng vật tư` }
    }
    const ingredientIds = data.nguyenLieu.map((item) => item.nguyenLieuId)
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      return { error: `Không được chọn trùng nguyên liệu` }
    }
    const khoiLuong = calculateKhoiLuong(data.quyCach, data.tiTrong)
    if (khoiLuong == null) {
      return { error: `Sản phẩm có nước phải có tỉ trọng` }
    }
    const result = await prisma.sanPham.create({
      data: {
        mssp: data.mssp,
        mskh: data.mskh,
        tenThuongMai: data.tenThuongMai?.trim() ,
        tenPhanBon: data.tenPhanBon?.trim(),
        quyCach: data.quyCach,
        quyCachThung: data.quyCachThung,
        donGia: data.donGia,
        tiTrong: data.tiTrong,
        khoiLuong,
        nguyenLieu: { create: data.nguyenLieu },
        vatTu: { create: data.vatTu.map((ms) => ({ ms })) },
      },
      include: {
        khachHang: true,
        nguyenLieu: { include: { nguyenLieu: true } },
        vatTu: { include: { vatTu: true } },
      },
    })

    revalidatePath(`/san-pham`)
    return result
  } catch (error) {
    return fail(error)
  }
}

type ProductUpdateInput = {
  mssp: string
  mskh: string
  tenThuongMai?: string
  tenPhanBon?: string
  quyCach: string
  quyCachThung: number
  donGia: number
  tiTrong?: number | null
}

export async function updateProduct(mssp: string, data: ProductUpdateInput) {
  await requireSession()

  try {
    const khoiLuong = calculateKhoiLuong(data.quyCach, data.tiTrong)
    if (khoiLuong == null) {
      return { error: `Sản phẩm có nước phải có tỉ trọng` }
    }
    const result = await prisma.sanPham.update({
      where: { mssp },
      data: {
        mssp: data.mssp,
        mskh: data.mskh,
        tenThuongMai: data.tenThuongMai?.trim(),
        tenPhanBon: data.tenPhanBon?.trim(),
        quyCach: data.quyCach,
        quyCachThung: data.quyCachThung,
        donGia: data.donGia,
        khoiLuong,
        tiTrong: data.tiTrong,
      },
      include: {
        khachHang: true,
        nguyenLieu: { include: { nguyenLieu: true } },
        vatTu: { include: { vatTu: true } },
      },
    })

    revalidatePath(`/san-pham`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function updateProductRecipe(
  mssp: string,
  nguyenLieu: { nguyenLieuId: string; dinhLuong: number }[],
) {
  await requireSession()

  if (nguyenLieu.some((item) => !item.nguyenLieuId || !Number.isFinite(item.dinhLuong) || item.dinhLuong <= 0)) {
    return { error: `Định lượng nguyên liệu phải lớn hơn 0` }
  }

  if (new Set(nguyenLieu.map((item) => item.nguyenLieuId)).size !== nguyenLieu.length) {
    return { error: `Không được chọn trùng nguyên liệu` }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.sanPhamNguyenLieu.deleteMany({ where: { mssp } })
      return tx.sanPhamNguyenLieu.createMany({
        data: nguyenLieu.map((item) => ({ mssp, ...item })),
      })
    })

    revalidatePath(`/san-pham`)
    return { success: true, count: result.count }
  } catch (error) {
    return fail(error)
  }
}

export async function updateProductVatTu(mssp: string, msList: string[]) {
  await requireSession()

  if (new Set(msList).size !== msList.length || msList.some((ms) => !ms)) {
    return { error: `Danh sách vật tư không hợp lệ` }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sanPhamVatTu.deleteMany({ where: { mssp } })
      await tx.sanPhamVatTu.createMany({
        data: msList.map((ms) => ({ mssp, ms })),
      })
    })

    revalidatePath(`/san-pham`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteProduct(mssp: string) {
  await requireSession()

  try {
    await prisma.sanPham.delete({ where: { mssp } })
    revalidatePath(`/san-pham`)
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function exportProductExcelFile(mssp: string) {
  await requireSession()

  try {
    const product = await prisma.sanPham.findUnique({
      where: { mssp },
      include: {
        nguyenLieu: {
          include: {
            nguyenLieu: {
              include: {
                gia: {
                  orderBy: {
                    ngay: `desc`,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!product) {
      return { error: `Sản phẩm không tồn tại` }
    }

    const excel = await Excel.loadTemplate(`ctm.xlsx`)
    if ('error' in excel) {
      return { error: excel.error }
    }
    const displayName = product.tenThuongMai?.trim() || product.mssp
    excel.writeAndApplyFont(`A1`, displayName, 16)
    let rowIndex = 4
    let totalMass = 0
    let totalCost = 0
    product.nguyenLieu.forEach((item, index) => {
      const mass = Number(item.dinhLuong)
      totalMass += mass
      const donGia = item.nguyenLieu.gia[0]?.donGia || 0
      const total = mass * donGia
      totalCost += total
      excel.writeCell(`A${rowIndex}`, `${index + 1}`)
      excel.writeCell(`B${rowIndex}`, item.nguyenLieu.ten)
      excel.writeCell(`C${rowIndex}`, donGia)
      excel.writeCell(`D${rowIndex}`, mass)
      excel.writeCell(`E${rowIndex}`, total)
      rowIndex++
    })

    excel.writeCell(`A17`, totalMass)
    excel.writeCell(`A19`, totalCost)

    const output = await excel.createOutput()
    return { data: Buffer.from(output as unknown as Uint8Array).toString('base64'), fileName: `${displayName}.xlsx` }
  } catch (error) {
    return fail(error)
  }
}
