'use server'

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/app/actions/users/data"
import {fail, formatDateTime, formatSoPhieu} from "@/lib/utils"
import Excel from "@/lib/excel";

export async function listXuatHang(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const where: Prisma.XuatHangWhereInput | undefined = query
    ? {
        mskh: { contains: query, mode: `insensitive` },
      }
    : undefined

  const [rows, total] = await Promise.all([
    prisma.xuatHang.findMany({
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
          select: {
            mssp: true,
            soLuongThung: true,
            soHangLe: true,
            donGia: true,
            tongTien: true,
          },
          orderBy: { mssp: `asc` },
        },
      },
      orderBy: { soPhieu: `desc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.xuatHang.count({ where }),
  ])

  const items = rows.map((row) => ({
    soPhieu: row.soPhieu,
    mskh: row.mskh,
    tenKhachHang: row.khachHang.ten,
    tenCongTy: row.khachHang.tenCongTy,
    diaChiGiaoHang: row.diaChiGiaoHang ?? `Nhận tại kho`,
    sdtChanh: row.sdtChanh ?? null,
    ngayXuatHang: row.ngayXuatHang.toISOString(),
    sanPham: row.sanPham.map((sp) => ({
      mssp: sp.mssp,
      soLuongThung: sp.soLuongThung,
      soHangLe: sp.soHangLe,
      giaTien: sp.donGia,
    })),
  }))

  return { items, total }
}

export async function getNextSoPhieu() {
  await requireSession()

  const last = await prisma.xuatHang.findFirst({
    orderBy: { soPhieu: `desc` },
    select: { soPhieu: true },
  })
  return (last?.soPhieu ?? 0) + 1
}

export async function createXuatHang(
  mskh: string,
  sanPham: { mssp: string; soLuongThung: number; soHangLe: number }[],
  diaChiGiaoHang: string = `Nhận tại kho`,
  sdtChanh?: string | null,
) {
  const session = await requireSession()
  const customerCode = mskh.trim()
  const deliveryAddress = diaChiGiaoHang.trim()
  const phoneChanh = sdtChanh?.trim() || null

  if (!customerCode || sanPham.length === 0) {
    return { error: `Khách hàng và ít nhất một sản phẩm là bắt buộc` }
  }

  if (!deliveryAddress) {
    return { error: `Địa chỉ giao hàng là bắt buộc` }
  }

  if (deliveryAddress !== `Nhận tại kho` && !phoneChanh) {
    return { error: `Số điện thoại chành là bắt buộc khi chọn địa chỉ khác` }
  }

  if (sanPham.some((item) => !Number.isInteger(item.soLuongThung) || item.soLuongThung <= 0)) {
    return { error: `Số lượng thùng phải là số nguyên lớn hơn 0` }
  }

  if (sanPham.some((item) => item.soHangLe !== undefined && (!Number.isInteger(item.soHangLe) || item.soHangLe < 0))) {
    return { error: `Số hàng lẻ phải là số nguyên không âm` }
  }

  const productCodes = sanPham.map((item) => item.mssp)
  if (new Set(productCodes).size !== productCodes.length) {
    return { error: `Không được chọn trùng sản phẩm` }
  }

  try {
    const products = await prisma.sanPham.findMany({
      where: { mskh: customerCode, mssp: { in: productCodes } },
      select: {
        mssp: true,
        tenThuongMai: true,
        tenPhanBon: true,
        quyCach: true,
        quyCachThung: true,
        donGia: true,
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
    })

    if (products.length !== productCodes.length) {
      return { error: `Sản phẩm không thuộc khách hàng đã chọn` }
    }

    const productMap = new Map(products.map((p) => [p.mssp, p]))

    const nguyenLieuMap = new Map<string, { tenNguyenLieu: string; donGia: number; soLuong: number }>()
    const vatTuMap = new Map<string, { maVatTu: string; donGia: number; soLuong: number }>()

    for (const item of sanPham) {
      const product = productMap.get(item.mssp)!
      const soHangLe = item.soHangLe || 0
      const totalUnits = item.soLuongThung * product.quyCachThung + soHangLe

      for (const nlItem of product.nguyenLieu) {
        const tenNguyenLieu = nlItem.nguyenLieu.ten
        const donGia = nlItem.nguyenLieu.gia[0]?.donGia ?? 0
        const qty = totalUnits * Number(nlItem.dinhLuong)

        const existing = nguyenLieuMap.get(tenNguyenLieu)
        if (existing) {
          existing.soLuong += qty
        } else {
          nguyenLieuMap.set(tenNguyenLieu, {
            tenNguyenLieu,
            donGia,
            soLuong: qty,
          })
        }
      }

      for (const vtItem of product.vatTu) {
        const maVatTu = vtItem.ms
        const donGia = vtItem.vatTu.gia[0]?.donGia ?? 0
        const qty = vtItem.vatTu.ten === `THUNG` ? item.soLuongThung : totalUnits

        const existing = vatTuMap.get(maVatTu)
        if (existing) {
          existing.soLuong += qty
        } else {
          vatTuMap.set(maVatTu, {
            maVatTu,
            donGia,
            soLuong: qty,
          })
        }
      }
    }

    const delivery = await prisma.xuatHang.create({
      data: {
        mskh: customerCode,
        nguoiLapPhieuId: session.userId,
        diaChiGiaoHang: deliveryAddress,
        sdtChanh: phoneChanh,
        sanPham: {
          create: sanPham.map((item) => {
            const product = productMap.get(item.mssp)!
            const soHangLe = item.soHangLe || 0
            const tongTien = (item.soLuongThung * product.quyCachThung + soHangLe) * product.donGia
            return {
              mssp: item.mssp,
              tenThuongMai: product.tenThuongMai,
              tenPhanBon: product.tenPhanBon,
              quyCach: product.quyCach,
              quyCachThung: product.quyCachThung,
              donGia: product.donGia,
              soLuongThung: item.soLuongThung,
              soHangLe,
              tongTien,
            }
          }),
        },
        nguyenLieu: {
          create: Array.from(nguyenLieuMap.values()).map((nl) => ({
            tenNguyenLieu: nl.tenNguyenLieu,
            donGia: nl.donGia,
            soLuong: new Prisma.Decimal(nl.soLuong.toFixed(3)),
            tongTien: Math.round(nl.soLuong * nl.donGia),
          })),
        },
        vatTu: {
          create: Array.from(vatTuMap.values()).map((vt) => ({
            maVatTu: vt.maVatTu,
            donGia: vt.donGia,
            soLuong: vt.soLuong,
            tongTien: vt.soLuong * vt.donGia,
          })),
        },
      },
    })

    const excel = await Excel.loadTemplate(`pxh.xlsx`)
    if ('error' in excel) {
      return { error: excel.error }
    }

    excel
        .writeAndApplyFont(`H1`, formatSoPhieu(delivery.soPhieu))
        .writeAndApplyFont(`H2`, formatDateTime(delivery.ngayXuatHang))

    const customer = await prisma.khachHang.findUnique({
      where: { mskh: customerCode }
    })
    if (!customer) {
      return { error: `Không tìm thấy thông tin khách hàng` }
    }

    excel
        .writeAndApplyFont(`C4`, customer.ten)
        .writeAndApplyFont(`C5`, customer.tenCongTy ?? ``)
        .writeAndApplyFont(`C6`, customer.maSoThue ?? ``)
        .writeAndApplyFont(`C7`, customer.diaChi)
        .writeAndApplyFont(`E4`, customer.soDienThoai ?? ``)
        .writeAndApplyFont(`H4`, customer.tinh)

    let rowIndex = 10
    products.forEach((product, index) => {
      excel.addRow([index + 1, product.mssp, product.tenThuongMai, product.quyCach, product.quyCachThung, sanPham[index].soLuongThung, sanPham[index].soHangLe || 0])
      for (let i = 'A'.charCodeAt(0) ; i <= 'H'.charCodeAt(0) ; i++) {
        excel.applyFont(`${String.fromCharCode(i)}${rowIndex}`)
            .applyBorder(`${String.fromCharCode(i)}${rowIndex}`)
      }
      rowIndex++
    })
    excel
        .addRow([])
        .writeAndApplyFont(`F${rowIndex}`, sanPham.reduce((acc, item) => acc + item.soLuongThung, 0))
        .writeAndApplyFont(`G${rowIndex}`, sanPham.reduce((acc, item) => acc + item.soHangLe, 0))
    for (let i = 'A'.charCodeAt(0) ; i <= 'H'.charCodeAt(0) ; i++) {
      excel.applyFont(`${String.fromCharCode(i)}${rowIndex}`)
          .applyBorder(`${String.fromCharCode(i)}${rowIndex}`)
    }
    rowIndex++

    excel
        .writeAndApplyFont(`A${rowIndex}`, `Địa chỉ giao hàng:`)
        .writeAndApplyFont(`C${rowIndex}`, deliveryAddress)
        .mergeCells(`G${rowIndex}`, `H${rowIndex}`)
        .writeAndApplyFont(`F${rowIndex}`, `SĐT chành:`)
        .writeAndApplyFont(`H${rowIndex}`, phoneChanh ?? ``)
        .applyFont(`H${rowIndex++}`)
        .writeAndApplyFont(`A${rowIndex}`, `Người lập phiếu`)
        .writeAndApplyFont(`C${rowIndex}`, `Người lên hàng`)
        .writeAndApplyFont(`E${rowIndex}`, `Thủ kho`)
        .writeAndApplyFont(`G${rowIndex}`, `Người nhận hàng`)

    const output = await excel.createOutput()

    revalidatePath(`/xuat-hang`)
    return {
      fileName: `pxh-${formatSoPhieu(delivery.soPhieu)}-${customerCode}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
      soPhieu: delivery.soPhieu,
    }
  } catch (error) {
    return fail(error)
  }
}
