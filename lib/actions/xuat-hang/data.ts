'use server'

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/actions/users/data"
import {fail, formatDateTime, formatSoPhieu} from "@/lib/utils"
import Excel from "@/lib/excel";

export async function listXuatHang(search = ``, page?: number, pageSize?: number) {
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
          include: {
            nguyenLieu: {
              orderBy: { tenNguyenLieu: `asc` },
            },
            vatTu: {
              orderBy: { maVatTu: `asc` },
            },
          },
          orderBy: { mssp: `asc` },
        },
      },
      orderBy: { soPhieu: `desc` },
      ...(pageSize ? { skip: ((page ?? 1) - 1) * pageSize, take: pageSize } : {}),
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
      tenThuongMai: sp.tenThuongMai,
      tenPhanBon: sp.tenPhanBon,
      quyCach: sp.quyCach,
      quyCachThung: sp.quyCachThung,
      donGia: sp.donGia,
      soLuongThung: sp.soLuongThung,
      soHangLe: sp.soHangLe,
      tongTien: sp.tongTien,
      giaTien: sp.donGia,
      nguyenLieu: sp.nguyenLieu.map((nl) => ({
        id: nl.id,
        tenNguyenLieu: nl.tenNguyenLieu,
        donGia: nl.donGia,
        dinhLuong: nl.dinhLuong,
        tongTien: nl.tongTien,
      })),
      vatTu: sp.vatTu.map((vt) => ({
        id: vt.id,
        maVatTu: vt.maVatTu,
        donGia: vt.donGia,
        soLuong: vt.soLuong,
        tongTien: vt.tongTien,
      })),
    })),
  }))

  return { items, total }
}

type RawSeqRow = {
  last_value: bigint | number
  is_called: boolean
}

export async function getNextSoPhieu() {
  await requireSession()

  const [seqNameRow] = await prisma.$queryRaw<[{ seq_name: string }]>`
  SELECT pg_get_serial_sequence('xuat_hang', 'soPhieu') AS seq_name;
`

  if (!seqNameRow?.seq_name) {
    throw new Error('Sequence not found for xuat_hang.soPhieu')
  }

  const [seq] = await prisma.$queryRawUnsafe<RawSeqRow[]>(
      `SELECT last_value, is_called FROM ${seqNameRow.seq_name};`
  )

  return seq.is_called ? Number(seq.last_value) + 1 : Number(seq.last_value)
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

  if (!customerCode) {
    return { error: `Khách hàng là bắt buộc` }
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
    const customer = await prisma.khachHang.findUnique({
      where: { mskh: customerCode },
      select: { quanLyMskh: true },
    })
    const allowedCustomerCodes = customer?.quanLyMskh ? [customerCode, customer.quanLyMskh] : [customerCode]

    const products = await prisma.sanPham.findMany({
      where: { mskh: { in: allowedCustomerCodes }, mssp: { in: productCodes } },
      select: {
        mssp: true,
        tenThuongMai: true,
        tenPhanBon: true,
        quyCach: true,
        quyCachThung: true,
        donGia: true,
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

    const nguyenLieuKhoDelta = new Map<string, number>()
    const vatTuKhoDelta = new Map<string, number>()

    const sanPhamCreateData = sanPham.map((item) => {
      const product = productMap.get(item.mssp)!
      const soHangLe = item.soHangLe || 0
      const totalNumberOfSanPham = product.quyCachThung * item.soLuongThung + soHangLe
      const tongTien = totalNumberOfSanPham * product.donGia

      const totalMassNguyenLieu = totalNumberOfSanPham * (product.khoiLuong || 0)
      const totalMassNguyenLieuCongThuc = product.nguyenLieu.reduce(
        (sum, nlItem) => sum + Number(nlItem.dinhLuong),
        0,
      )

      const nguyenLieuList = product.nguyenLieu.map((nlItem) => {
        const tenNguyenLieu = nlItem.nguyenLieu.ten
        const donGia = nlItem.nguyenLieu.gia[0]?.donGia ?? 0
        const nguyenLieuMassCongThuc = Number(nlItem.dinhLuong)
        const consumed =
          totalMassNguyenLieuCongThuc > 0
            ? (totalMassNguyenLieu / totalMassNguyenLieuCongThuc) * nguyenLieuMassCongThuc
            : 0

        nguyenLieuKhoDelta.set(
          nlItem.nguyenLieu.id,
          (nguyenLieuKhoDelta.get(nlItem.nguyenLieu.id) ?? 0) + consumed,
        )

        return {
          tenNguyenLieu,
          donGia,
          dinhLuong: Number(consumed.toFixed(3)),
          tongTien: Math.round(consumed * donGia),
        }
      })

      const vatTuList = product.vatTu.map((vtItem) => {
        const maVatTu = vtItem.ms
        const donGia = vtItem.vatTu.gia[0]?.donGia ?? 0
        const qty = vtItem.vatTu.loai === `THUNG` ? item.soLuongThung : totalNumberOfSanPham

        vatTuKhoDelta.set(
          maVatTu,
          (vatTuKhoDelta.get(maVatTu) ?? 0) + qty,
        )

        return {
          maVatTu,
          donGia,
          soLuong: qty,
          tongTien: qty * donGia,
        }
      })

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
        nguyenLieu: {
          create: nguyenLieuList,
        },
        vatTu: {
          create: vatTuList,
        },
      }
    })

    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.xuatHang.create({
        data: {
          mskh: customerCode,
          nguoiLapPhieuId: session.userId,
          diaChiGiaoHang: deliveryAddress,
          sdtChanh: phoneChanh,
          sanPham: {
            create: sanPhamCreateData,
          },
        },
      })

      // Adjust "kho" of NguyenLieu and VatTu
      await Promise.all([
        ...Array.from(nguyenLieuKhoDelta.entries()).map(([nlId, qty]) =>
            tx.nguyenLieu.update({
              where: { id: nlId },
              data: { kho: { decrement: Math.round(qty) } },
            })
        ),
        ...Array.from(vatTuKhoDelta.entries()).map(([maVatTu, qty]) =>
            tx.vatTu.update({
              where: { ms: maVatTu },
              data: { kho: { decrement: qty } },
            })
        ),
      ])

      return created
    }, {
      maxWait: 5000,
      timeout: 15000
    })

    const result = await exportXuatHangExcel(delivery.soPhieu)
    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath(`/xuat-hang`)
    revalidatePath(`/nguyen-lieu`)
    revalidatePath(`/vat-tu`)
    return result
  } catch (error) {
    return fail(error)
  }
}

export async function exportXuatHangExcel(soPhieu: number) {
  try {
    const delivery = await prisma.xuatHang.findUnique({
      where: { soPhieu },
      include: {
        khachHang: true,
        sanPham: {
          include: {
            nguyenLieu: true,
            vatTu: true,
          },
        },
      },
    })
    if (!delivery) {
      return { error: `Không tìm thấy phiếu xuất hàng ${soPhieu}` }
    }
    const customer = delivery.khachHang
    const products = delivery.sanPham

    const excel = await Excel.loadTemplate(`pxh.xlsx`)
    if ('error' in excel) {
      return { error: excel.error }
    }

    excel
        .writeAndApplyFont(`H1`, `XH26${formatSoPhieu(delivery.soPhieu)}`)
        .writeAndApplyFont(`H2`, formatDateTime(delivery.ngayXuatHang))

    excel
        .writeAndApplyFont(`C4`, customer.ten)
        .writeAndApplyFont(`C5`, customer.tenCongTy ?? ``)
        .writeAndApplyFont(`C6`, customer.maSoThue ?? ``)
        .writeAndApplyFont(`C7`, customer.diaChi)
        .writeAndApplyFont(`E4`, customer.soDienThoai ?? ``)
        .writeAndApplyFont(`H4`, customer.tinh)

    let rowIndex = 10
    products.forEach((product, index) => {
      excel.addRow([index + 1, product.mssp, product.tenThuongMai ?? "", product.quyCach, product.quyCachThung, product.soLuongThung, product.soHangLe || 0])
      for (let i = 'A'.charCodeAt(0) ; i <= 'H'.charCodeAt(0) ; i++) {
        excel.applyFont(`${String.fromCharCode(i)}${rowIndex}`)
            .applyBorder(`${String.fromCharCode(i)}${rowIndex}`)
      }
      rowIndex++
    })
    excel
        .addRow([])
        .writeAndApplyFont(`F${rowIndex}`, products.reduce((acc, item) => acc + item.soLuongThung, 0))
        .writeAndApplyFont(`G${rowIndex}`, products.reduce((acc, item) => acc + item.soHangLe, 0))
    for (let i = 'A'.charCodeAt(0) ; i <= 'H'.charCodeAt(0) ; i++) {
      excel.applyFont(`${String.fromCharCode(i)}${rowIndex}`)
          .applyBorder(`${String.fromCharCode(i)}${rowIndex}`)
    }
    rowIndex++

    excel
        .writeAndApplyFont(`A${rowIndex}`, `Địa chỉ giao hàng:`)
        .writeAndApplyFont(`C${rowIndex}`, delivery.diaChiGiaoHang ?? ``)
        .mergeCells(`C${rowIndex}`, `H${rowIndex}`)
        .writeAndApplyFont(`A${++rowIndex}`, `SĐT chành:`)
        .writeAndApplyFont(`C${rowIndex}`, delivery.sdtChanh ?? ``)
        .applyFont(`H${rowIndex++}`)
        .writeAndApplyFont(`A${rowIndex}`, `Người lập phiếu`)
        .writeAndApplyFont(`C${rowIndex}`, `Người lên hàng`)
        .writeAndApplyFont(`E${rowIndex}`, `Thủ kho`)
        .writeAndApplyFont(`G${rowIndex}`, `Người nhận hàng`)
    const output = await excel.createOutput()
    return {
      fileName: `pxh-${formatSoPhieu(delivery.soPhieu)}-${customer.mskh}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
      soPhieu: delivery.soPhieu,
    }
  } catch (error) {
    return fail(error)
  }
}
