'use server'

export type SanXuatNguyenLieu = {
  id: string
  tenNguyenLieu: string
  donGia: number
  dinhLuong: number
  tongTien: number
}

export type SanXuatSanPham = {
  mssp: string
  tenThuongMai: string | null
  tenPhanBon: string | null
  donGia: number
  tiTrong: number | null
  khoiLuong: number
  nguyenLieu: SanXuatNguyenLieu[]
}

export type SanXuatItem = {
  id: number
  mskh: string
  tenKhachHang: string
  tenCongTy: string | null
  ngaySanXuat: string
  mssp: string
  tenThuongMai: string | null
  tenPhanBon: string | null
  sanPham: SanXuatSanPham
}

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/actions/users/data"
import {fail, formatNumber, formatSoPhieu} from "@/lib/utils"
import Excel from "@/lib/excel";

export async function listSanXuat(search = ``, page?: number, pageSize?: number) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.SanXuatWhereInput | undefined = query
    ? {
        OR: [
          { mskh: { contains: query, mode: `insensitive` } },
          { khachHang: { ten: { contains: query, mode: `insensitive` } } },
          { sanPham: { mssp: { contains: query, mode: `insensitive` } } },
        ],
      }
    : undefined

  const [rows, total] = await Promise.all([
    prisma.sanXuat.findMany({
      where,
      include: {
        khachHang: {
          select: {
            mskh: true,
            ten: true,
            tenCongTy: true,
          },
        },
        sanPham: {
          include: {
            nguyenLieu: {
              orderBy: { tenNguyenLieu: `asc` },
            },
          },
        },
      },
      orderBy: { id: `desc` },
      ...(pageSize ? { skip: ((page ?? 1) - 1) * pageSize, take: pageSize } : {}),
    }),
    prisma.sanXuat.count({ where }),
  ])

  const items = rows.map((row) => ({
    id: row.id,
    mskh: row.mskh,
    tenKhachHang: row.khachHang.ten,
    tenCongTy: row.khachHang.tenCongTy,
    ngaySanXuat: row.ngaySanXuat.toISOString(),
    mssp: row.sanPham?.mssp ?? ``,
    tenThuongMai: row.sanPham?.tenThuongMai ?? null,
    tenPhanBon: row.sanPham?.tenPhanBon ?? null,
    sanPham: {
      mssp: row.sanPham?.mssp ?? ``,
      tenThuongMai: row.sanPham?.tenThuongMai ?? null,
      tenPhanBon: row.sanPham?.tenPhanBon ?? null,
      donGia: row.sanPham?.donGia ?? 0,
      tiTrong: row.sanPham?.tiTrong ?? null,
      khoiLuong: row.sanPham?.khoiLuong ?? 0,
      nguyenLieu: (row.sanPham?.nguyenLieu ?? []).map((nl) => ({
        id: nl.id,
        tenNguyenLieu: nl.tenNguyenLieu,
        donGia: nl.donGia,
        dinhLuong: nl.dinhLuong,
        tongTien: nl.tongTien,
      })),
    },
  }))

  return { items, total }
}

export async function listProductsWithRecipeForCustomer(mskh: string) {
  await requireSession()

  const customer = await prisma.khachHang.findUnique({
    where: { mskh },
    select: { quanLyMskh: true },
  })

  const customerCodes = customer?.quanLyMskh ? [mskh, customer.quanLyMskh] : [mskh]

  const products = await prisma.sanPham.findMany({
    where: { mskh: { in: customerCodes } },
    orderBy: { mssp: `asc` },
    select: {
      mssp: true,
      tenPhanBon: true,
      tenThuongMai: true,
      donGia: true,
      tiTrong: true,
      khoiLuong: true,
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
    },
  })

  return products.map((p) => ({
    mssp: p.mssp,
    tenPhanBon: p.tenPhanBon,
    tenThuongMai: p.tenThuongMai,
    donGia: p.donGia,
    tiTrong: p.tiTrong,
    khoiLuong: p.khoiLuong,
    nguyenLieu: p.nguyenLieu.map((nlItem) => ({
      nguyenLieuId: nlItem.nguyenLieuId,
      tenNguyenLieu: nlItem.nguyenLieu.ten,
      donGia: nlItem.nguyenLieu.gia[0]?.donGia ?? 0,
      dinhLuong: Number(nlItem.dinhLuong),
    })),
  }))
}

export async function createSanXuat(data: {
  mskh: string
  mssp: string
  massOrVolume: number
}) {
  await requireSession()

  const customerCode = data.mskh?.trim()
  const productCode = data.mssp?.trim()
  const massOrVolume = Number(data.massOrVolume)

  if (!customerCode) {
    return { error: `Khách hàng là bắt buộc` }
  }

  if (!productCode) {
    return { error: `Sản phẩm là bắt buộc` }
  }

  if (!massOrVolume || isNaN(massOrVolume) || massOrVolume <= 0) {
    return { error: `Khối lượng / thể tích phải là số lớn hơn 0` }
  }

  try {
    const customer = await prisma.khachHang.findUnique({
      where: { mskh: customerCode },
      select: { quanLyMskh: true },
    })
    const allowedCustomerCodes = customer?.quanLyMskh ? [customerCode, customer.quanLyMskh] : [customerCode]

    const product = await prisma.sanPham.findFirst({
      where: { mssp: productCode, mskh: { in: allowedCustomerCodes } },
      include: {
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
      },
    })

    if (!product) {
      return { error: `Sản phẩm không thuộc khách hàng đã chọn` }
    }

    const totalMass =
      product.tiTrong && product.tiTrong > 0
        ? massOrVolume * product.tiTrong
        : massOrVolume

    const totalMassCongThuc = product.nguyenLieu.reduce(
      (sum, item) => sum + Number(item.dinhLuong),
      0,
    )

    const nguyenLieuList = product.nguyenLieu.map((nlItem) => {
      const tenNguyenLieu = nlItem.nguyenLieu.ten
      const donGia = nlItem.nguyenLieu.gia[0]?.donGia ?? 0
      const recipeDinhLuong = Number(nlItem.dinhLuong)
      const consumed =
        totalMassCongThuc > 0
          ? (totalMass / totalMassCongThuc) * recipeDinhLuong
          : 0
      const dinhLuong = Number(consumed.toFixed(3))
      const tongTien = Math.round(dinhLuong * donGia)
      return {
        tenNguyenLieu,
        donGia,
        dinhLuong,
        tongTien,
      }
    })

    const created = await prisma.sanXuat.create({
      data: {
        mskh: customerCode,
        sanPham: {
          create: {
            mssp: product.mssp,
            tenThuongMai: product.tenThuongMai,
            tenPhanBon: product.tenPhanBon,
            donGia: product.donGia,
            tiTrong: product.tiTrong,
            khoiLuong: totalMass,
            nguyenLieu: {
              create: nguyenLieuList,
            },
          },
        },
      },
    })

    const result = await exportSanXuatExcel(created.id)
    if (`error` in result) {
      return { error: result.error }
    }

    revalidatePath(`/san-xuat`)
    return {
      success: true,
      id: created.id,
      fileName: result.fileName,
      data: result.data,
    }
  } catch (error) {
    return fail(error)
  }
}

export async function exportSanXuatExcel(id: number) {
  await requireSession()
  try {
    const sanXuat = await prisma.sanXuat.findUnique({
      where: { id },
      include: {
        khachHang: true,
        sanPham: {
          include: {
            nguyenLieu: true,
          },
        },
      },
    })
    if (!sanXuat || !sanXuat.sanPham) {
      return { error: `Không tìm thấy lệnh sản xuất #${id}` }
    }
    const customer = sanXuat.khachHang
    const product = sanXuat.sanPham
    const totalMass = product.tiTrong && product.tiTrong > 0 ? product.khoiLuong / product.tiTrong : product.khoiLuong
    const excel = await Excel.loadTemplate(`lsx.xlsx`)
    if (`error` in excel) {
      return { error: `Không thể tải template Excel` }
    }
    excel
        .writeAndApplyFont(`D1`, `Lệnh sản xuất #${formatSoPhieu(id)}`, 12)
        .writeAndApplyFont(`D2`, `Ngày: ${sanXuat.ngaySanXuat.toLocaleDateString()}`, 12)
        .writeAndApplyFont(`B3`, customer.ten, 12)
        .writeAndApplyFont(`B4`, customer.tenCongTy ?? ``, 12)
        .writeAndApplyFont(`D4`, product.tenPhanBon ?? ``, 12)
        .writeAndApplyFont(`B5`, product.mssp, 12)
        .writeAndApplyFont(`B6`, product.tenThuongMai ?? ``, 12)
        .writeAndApplyFont(`D6`, formatNumber(totalMass), 12)
    let rowIndex = 8
    product.nguyenLieu.forEach((nl, index) => {
      excel
          .writeAndApplyFont(`A${rowIndex}`, index + 1, 12)
          .applyBorder(`A${rowIndex}`)
          .writeAndApplyFont(`B${rowIndex}`, nl.tenNguyenLieu, 12)
          .applyBorder(`B${rowIndex}`)
          .writeAndApplyFont(`C${rowIndex}`, formatNumber(nl.donGia), 12)
          .applyBorder(`C${rowIndex}`)
          .writeAndApplyFont(`D${rowIndex}`, formatNumber(nl.dinhLuong), 12)
          .applyBorder(`D${rowIndex}`)
          .writeAndApplyFont(`E${rowIndex}`, formatNumber(nl.tongTien), 12)
          .applyBorder(`E${rowIndex}`)
      rowIndex++
    })
    const totalDinhLuong = product.nguyenLieu.reduce((acc, nl) => acc + nl.dinhLuong, 0)
    const grandTotalTien = product.nguyenLieu.reduce((acc, nl) => acc + nl.tongTien, 0)
    excel
        .writeAndApplyFont(`D21`, formatNumber(totalDinhLuong), 12)
        .writeAndApplyFont(`E21`, formatNumber(grandTotalTien), 12)
    const output = await excel.createOutput()
    return { data: Buffer.from(output as unknown as Uint8Array).toString('base64'), fileName: `LSX_${formatSoPhieu(id)}.xlsx` }
  } catch (error) {
    return fail(error)
  }
}
