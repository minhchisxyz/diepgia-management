'use server'

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/app/actions/users/data"
import path from "node:path"
import ExcelJS, { Row } from "exceljs"
import { fail, formatDateTime } from "@/lib/utils"

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

    const templatePath = path.join(process.cwd(), `public`, `pxh.xlsx`)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(templatePath)
    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      return { error: `Không thể đọc file mẫu phiếu xuất hàng` }
    }
    worksheet.getCell(`H1`).value = delivery.soPhieu
    worksheet.getCell(`H2`).value = formatDateTime(delivery.ngayXuatHang)

    const customer = await prisma.khachHang.findUnique({ where: { mskh: customerCode } })
    if (!customer) {
      return { error: `Không tìm thấy thông tin khách hàng` }
    }
    worksheet.getCell(`C4`).value = customer.ten
    worksheet.getCell(`C5`).value = customer.tenCongTy ?? ``
    worksheet.getCell(`C6`).value = customer.maSoThue ?? ``
    worksheet.getCell(`C7`).value = customer.diaChi
    worksheet.getCell(`E4`).value = customer.soDienThoai ?? ``
    worksheet.getCell(`H4`).value = customer.tinh
    function formatRow(row: Row) {
      for (let i = 1 ; i <= 8 ; i++) {
        const cell = row.getCell(i)
        cell.font = {
          name: 'Times New Roman',
          size: 9,
        }
        cell.border = {
          top: { style: `thin` },
          left: { style: `thin` },
          bottom: { style: `thin` },
          right: { style: `thin` },
        }
      }
    }
    products.forEach((product, index) => {
      formatRow(worksheet.addRow([index + 1, product.mssp, product.tenThuongMai, product.quyCach, product.quyCachThung, sanPham[index].soLuongThung, sanPham[index].soHangLe || 0]))
    })
    formatRow(worksheet.addRow([]))
    const start = 11 + sanPham.length
    worksheet.getCell(`F${start - 1}`).value = sanPham.reduce((acc, item) => acc + item.soLuongThung, 0)
    worksheet.getCell(`F${start - 1}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`A${start}`).value = `Địa chỉ giao hàng:`
    worksheet.getCell(`A${start}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`C${start}`).value = deliveryAddress
    worksheet.getCell(`C${start}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`G${start}`).value = `SĐT chành:`
    worksheet.getCell(`G${start}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`H${start}`).value = phoneChanh ?? ``
    worksheet.getCell(`H${start}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`A${start + 1}`).value = `Người lập phiếu`
    worksheet.getCell(`A${start + 1}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`C${start + 1}`).value = `Người lên hàng`
    worksheet.getCell(`C${start + 1}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`C${start + 1}`).value = `Thủ kho`
    worksheet.getCell(`C${start + 1}`).font = { name: `Times New Roman`, size: 9 }

    worksheet.getCell(`G${start + 1}`).value = `Người nhận hàng`
    worksheet.getCell(`G${start + 1}`).font = { name: `Times New Roman`, size: 9 }

    const output = await workbook.xlsx.writeBuffer()

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
