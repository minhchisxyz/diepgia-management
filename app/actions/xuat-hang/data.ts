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
            giaTien: true,
            diaChiGiaoHang: true,
            sdtChanh: true,
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
    diaChiGiaoHang: row.sanPham[0]?.diaChiGiaoHang ?? `Nhận tại kho`,
    sdtChanh: row.sanPham[0]?.sdtChanh ?? null,
    ngayXuatHang: row.ngayXuatHang.toISOString(),
    sanPham: row.sanPham.map((sp) => ({
      mssp: sp.mssp,
      soLuongThung: sp.soLuongThung,
      soHangLe: sp.soHangLe,
      giaTien: sp.giaTien,
    })),
  }))

  return { items, total }
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
      select: { mssp: true, tenThuongMai: true, quyCach: true, quyCachThung: true, donGia: true },
    })

    if (products.length !== productCodes.length) {
      return { error: `Sản phẩm không thuộc khách hàng đã chọn` }
    }

    const productMap = new Map(products.map((p) => [p.mssp, p]))

    const delivery = await prisma.xuatHang.create({
      data: {
        mskh: customerCode,
        nguoiLapPhieuId: session.userId,
        sanPham: {
          create: sanPham.map((item) => {
            const product = productMap.get(item.mssp)!
            const soHangLe = item.soHangLe || 0
            const giaTien = (item.soLuongThung * product.quyCachThung + soHangLe) * product.donGia
            return {
              mssp: item.mssp,
              soLuongThung: item.soLuongThung,
              soHangLe,
              giaTien,
              diaChiGiaoHang: deliveryAddress,
              sdtChanh: phoneChanh,
            }
          }),
        },
      },
    })

    const excel = await Excel.loadTemplate(`pxh.xlsx`)
    if ('error' in excel) {
      return { error: excel.error }
    }

    excel.writeCell(`H1`, formatSoPhieu(delivery.soPhieu))
        .applyFont(`H1`)
        .writeCell(`H2`, formatDateTime(delivery.ngayXuatHang))
        .applyFont(`H2`)

    const customer = await prisma.khachHang.findUnique({
      where: { mskh: customerCode }
    })
    if (!customer) {
      return { error: `Không tìm thấy thông tin khách hàng` }
    }

    excel.writeCell(`C4`, customer.ten)
        .writeCell(`C5`, customer.tenCongTy ?? ``)
        .writeCell(`C6`, customer.maSoThue ?? ``)
        .writeCell(`C7`, customer.diaChi)
        .writeCell(`E4`, customer.soDienThoai ?? ``)
        .writeCell(`H4`, customer.tinh)
        .applyFont(`H4`)

    let rowIndex = 10
    products.forEach((product, index) => {
      excel.addRow([index + 1, product.mssp, product.tenThuongMai, product.quyCach, product.quyCachThung, sanPham[index].soLuongThung, sanPham[index].soHangLe || 0])
      for (let i = 'A'.charCodeAt(0) ; i <= 'H'.charCodeAt(0) ; i++) {
        excel.applyFont(`${String.fromCharCode(i)}${rowIndex}`)
            .applyBorder(`${String.fromCharCode(i)}${rowIndex}`)
      }
      rowIndex++
    })
    excel.addRow([])
        .writeCell(`F${rowIndex}`, sanPham.reduce((acc, item) => acc + item.soLuongThung, 0))
        .applyFont(`F${rowIndex}`)
        .writeCell(`G${rowIndex}`, sanPham.reduce((acc, item) => acc + item.soHangLe, 0))
        .applyFont(`G${rowIndex}`)
    for (let i = 'A'.charCodeAt(0) ; i <= 'H'.charCodeAt(0) ; i++) {
      excel.applyFont(`${String.fromCharCode(i)}${rowIndex}`)
          .applyBorder(`${String.fromCharCode(i)}${rowIndex}`)
    }
    rowIndex++

    excel.writeCell(`A${rowIndex}`, `Địa chỉ giao hàng:`)
        .applyFont(`A${rowIndex}`)
        .writeCell(`C${rowIndex}`, deliveryAddress)
        .applyFont(`C${rowIndex}`)
        .mergeCells(`G${rowIndex}`, `H${rowIndex}`)
        .writeCell(`F${rowIndex}`, `SĐT chành:`)
        .applyFont(`F${rowIndex}`)
        .writeCell(`H${rowIndex}`, phoneChanh ?? ``)
        .applyFont(`H${rowIndex++}`)
        .writeCell(`A${rowIndex}`, `Người lập phiếu`)
        .applyFont(`A${rowIndex}`)
        .writeCell(`C${rowIndex}`, `Người lên hàng`)
        .applyFont(`C${rowIndex}`)
        .writeCell(`E${rowIndex}`, `Thủ kho`)
        .applyFont(`E${rowIndex}`)
        .writeCell(`G${rowIndex}`, `Người nhận hàng`)
        .applyFont(`G${rowIndex}`)


    const output = await excel.returnOutput()

    revalidatePath(`/xuat-hang`)
    return {
      fileName: `pxh-${delivery.soPhieu}-${customerCode}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
      soPhieu: delivery.soPhieu,
    }
  } catch (error) {
    return fail(error)
  }
}
