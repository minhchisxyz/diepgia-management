'use server'

import {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {requireSession} from "@/app/actions/users/data";
import {revalidatePath} from "next/cache";
import {fail, formatPrice} from "@/lib/utils";
import Excel from "@/lib/excel";

export async function listProducts(search = ``, page = 1, pageSize = 10, mskh?: string) {
  await requireSession()

  const query = search.trim()
  const customerCode = mskh?.trim() || undefined
  const where: Prisma.SanPhamWhereInput | undefined = (query || customerCode)
      ? {
          ...(query ? { mssp: { contains: query, mode: `insensitive` } } : {}),
          ...(customerCode ? { mskh: customerCode } : {}),
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
      skip: (page - 1) * pageSize,
      take: pageSize,
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

  return prisma.sanPham.findMany({
    where: { mskh },
    orderBy: { mssp: `asc` },
    select: {
      mssp: true,
      tenPhanBon: true,
      tenThuongMai: true,
      quyCach: true,
      quyCachThung: true,
      donGia: true,
    },
  })
}

type ProductInput = {
  mssp: string
  mskh: string
  tenThuongMai: string
  tenPhanBon: string
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
    const result = await prisma.sanPham.create({
      data: {
        mssp: data.mssp,
        mskh: data.mskh,
        tenThuongMai: data.tenThuongMai,
        tenPhanBon: data.tenPhanBon,
        quyCach: data.quyCach,
        quyCachThung: data.quyCachThung,
        donGia: data.donGia,
        tiTrong: data.tiTrong != null && !isNaN(data.tiTrong) ? data.tiTrong : null,
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
  tenThuongMai: string
  tenPhanBon: string
  quyCach: string
  quyCachThung: number
  donGia: number
  tiTrong?: number | null
}

export async function updateProduct(mssp: string, data: ProductUpdateInput) {
  await requireSession()

  try {
    const result = await prisma.sanPham.update({
      where: { mssp },
      data: {
        mssp: data.mssp,
        mskh: data.mskh,
        tenThuongMai: data.tenThuongMai,
        tenPhanBon: data.tenPhanBon,
        quyCach: data.quyCach,
        quyCachThung: data.quyCachThung,
        donGia: data.donGia,
        tiTrong: data.tiTrong != null && !isNaN(data.tiTrong) ? data.tiTrong : null,
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
      await tx.congThucNguyenLieu.deleteMany({ where: { mssp } })
      return tx.congThucNguyenLieu.createMany({
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
                    ngay: `desc`
                  }
                }
              }
            }
          }
        },
      }
    })

    if (!product) {
      return { error: `Sản phẩm không tồn tại` }
    }

    const excel = await Excel.loadTemplate(`ctm.xlsx`)
    if ('error' in excel) {
      return { error: excel.error }
    }
    excel
        .writeAndApplyFont(`A1`, product.tenThuongMai, 16)
    let rowIndex = 4
    let totalMass = 0
    let totalCost = 0
    product.nguyenLieu.forEach((item, index) => {
      const mass = Number(item.dinhLuong)
      totalMass += mass
      const donGia = item.nguyenLieu.gia[0]?.donGia || 0
      const cost = (mass) * donGia
      totalCost += cost
      excel
          .writeAndApplyFont(`A${rowIndex}`, index + 1, 12)
          .applyBorder(`A${rowIndex}`)
          .writeAndApplyFont(`B${rowIndex}`, item.nguyenLieu.ten, 12)
          .applyBorder(`B${rowIndex}`)
          .writeAndApplyFont(`C${rowIndex}`, Number(item.dinhLuong), 12)
          .applyBorder(`C${rowIndex}`)
          .writeAndApplyFont(`D${rowIndex}`, formatPrice(donGia), 12)
          .applyBorder(`D${rowIndex}`)
          .writeAndApplyFont(`E${rowIndex++}`, formatPrice(cost), 12)
          .applyBorder(`E${rowIndex}`)
    })
    excel
        .applyBorder(`A${rowIndex}`)
        .writeAndApplyFont(`B${rowIndex}`, `TỔNG`, 12)
        .applyBorder(`B${rowIndex}`)
        .writeAndApplyFont(`C${rowIndex}`, totalMass, 12)
        .applyBorder(`C${rowIndex}`)
        .applyBorder(`D${rowIndex}`)
        .writeAndApplyFont(`E${rowIndex}`, formatPrice(totalCost), 12)
        .applyBorder(`E${rowIndex}`)

    const output = await excel.createOutput()
    return {
      fileName: `${product.tenThuongMai}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
    }
  } catch (error) {
    return fail(error)
  }
}
