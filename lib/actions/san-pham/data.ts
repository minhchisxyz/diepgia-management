'use server'

import {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {requireSession} from "@/lib/actions/users/data";
import {revalidatePath} from "next/cache";
import {calculateKhoiLuong, fail, formatPrice} from "@/lib/utils";
import Excel from "@/lib/excel";

export async function listProducts(search = ``, page = 1, pageSize = 10, mskh?: string) {
  const session = await requireSession()
  const isAdmin = session.role === `ADMIN`

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
    nguyenLieu: row.nguyenLieu.map(({ nguyenLieu, ...item }) => ({
      ...item,
      nguyenLieu: {
        id: nguyenLieu.id,
        ten: nguyenLieu.ten,
        donVi: nguyenLieu.donVi,
        loai: nguyenLieu.loai,
        donGia: isAdmin && nguyenLieu.gia[0]?.donGia != null ? String(nguyenLieu.gia[0].donGia) : null,
      },
      dinhLuong: item.dinhLuong.toString(),
      donGia: isAdmin && nguyenLieu.gia[0]?.donGia != null ? String(nguyenLieu.gia[0].donGia) : null,
    })),
    vatTu: row.vatTu.map((item) => ({
      ...item.vatTu,
      donGia: item.vatTu.gia[0]?.donGia != null ? String(item.vatTu.gia[0].donGia) : null,
    })),
  }))

  return { items, total, isAdmin }
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
  const user = await requireSession()
  const isAdmin = user.role === 'ADMIN'

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
    if (isAdmin) {
      excel.mergeCells(`A1`, `E1`)
    } else {
      excel
          .mergeCells(`A1`, `C1`)
          .writeCell(`D3`, null)
          .deleteBorder(`D3`)
          .writeCell(`E3`, null)
          .deleteBorder(`E3`)
    }
    excel.writeAndApplyFont(`A1`, displayName, 16).test()
    const startRowIndex = 4
    let rowIndex = 4
    product.nguyenLieu.forEach((item, index) => {
      const mass = Number(item.dinhLuong)
      const donGia = item.nguyenLieu.gia[0]?.donGia || 0
      excel
          .writeAndApplyFont(`A${rowIndex}`, `${index + 1}`, 12)
          .applyBorder(`A${rowIndex}`)
          .writeAndApplyFont(`B${rowIndex}`, item.nguyenLieu.ten, 12)
          .applyBorder(`B${rowIndex}`)
          .writeAndApplyFont(`C${rowIndex}`, mass, 12)
          .alignHorizontal(`C${rowIndex}`, `right`)
          .applyBorder(`C${rowIndex}`)
      if (isAdmin) {
        excel.writeAndApplyFont(`D${rowIndex}`, donGia, 12)
              .alignHorizontal(`D${rowIndex}`, `right`)
              .formatCurrency(`D${rowIndex}`)
              .applyBorder(`D${rowIndex}`)
              .writeAndApplyFont(`E${rowIndex}`, { formula: `C${rowIndex}*D${rowIndex}`}, 12)
              .alignHorizontal(`E${rowIndex}`, `right`)
              .formatCurrency(`E${rowIndex}`)
              .applyBorder(`E${rowIndex++}`)
      } else {
        rowIndex++
      }
    })

    excel
        .mergeCells(`A${rowIndex}`, `B${rowIndex}`)
        .writeAndApplyFont(`A${rowIndex}`, `TỔNG`, 12)
        .applyBorder(`A${rowIndex}`)
        .center(`A${rowIndex}`)
        .writeAndApplyFont(`C${rowIndex}`, { formula: `SUM(C${startRowIndex}:C${rowIndex - 1})`}, 12)
        .alignHorizontal(`C${rowIndex}`, `right`)
        .applyBorder(`C${rowIndex}`)
    if (isAdmin) {
      excel.applyBorder(`D${rowIndex}`)
            .writeAndApplyFont(`E${rowIndex}`, { formula: `SUM(E${startRowIndex}:E${rowIndex - 1})`}, 12)
            .alignHorizontal(`E${rowIndex}`, `right`)
            .formatCurrency(`E${rowIndex}`)
            .applyBorder(`E${rowIndex}`)
    }

    const output = await excel.createOutput()
    return { data: Buffer.from(output as unknown as Uint8Array).toString('base64'), fileName: `${displayName}.xlsx` }
  } catch (error) {
    return fail(error)
  }
}
