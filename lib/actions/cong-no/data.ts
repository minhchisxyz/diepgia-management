'use server'

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/actions/users/data"
import {fail, formatDateTime, formatPrice, formatSoPhieu, numberToVietnameseWords} from "@/lib/utils"
import Excel from "@/lib/excel";

export async function createThuTien(data: {
  mskh: string
  soTien: number
  lyDo: string
  noiNhan: string
  ngayThu?: string
}) {
  await requireSession()

  const customerCode = data.mskh?.trim()
  if (!customerCode) {
    return { error: `Khách hàng là bắt buộc` }
  }

  if (!Number.isInteger(data.soTien) || data.soTien <= 0) {
    return { error: `Số tiền phải là số nguyên lớn hơn 0` }
  }

  const lyDo = (data.lyDo || ``).trim()
  if (!lyDo) {
    return { error: `Lý do thu là bắt buộc` }
  }

  const noiNhan = (data.noiNhan || ``).trim()
  if (!noiNhan) {
    return { error: `Nơi nhận là bắt buộc` }
  }

  try {
    const customer = await prisma.khachHang.findUnique({
      where: { mskh: customerCode },
    })

    if (!customer) {
      return { error: `Không tìm thấy thông tin khách hàng` }
    }

    const ngayThuDate = data.ngayThu ? new Date(data.ngayThu) : new Date()

    const thuTien = await prisma.thuTien.create({
      data: {
        mskh: customerCode,
        soTien: data.soTien,
        lyDo,
        noiNhan,
        ngayThu: ngayThuDate,
      },
    })

    const excel = await Excel.loadTemplate(`ptt.xlsx`)
    if ('error' in excel) {
      return { error: excel.error }
    }
    excel
        .writeAndApplyFont(`H1`, `TN26${formatSoPhieu(thuTien.soPhieu)}`, 11)
        .writeAndApplyFont(`H2`, formatDateTime(thuTien.ngayThu), 11)
        .writeAndApplyFont(`C5`, customer.ten, 11)
        .writeAndApplyFont(`E5`, customer.soDienThoai ?? ``, 11)
        .writeAndApplyFont(`H5`, customer.tinh, 11)
        .writeAndApplyFont(`C6`, customer.tenCongTy ?? ``, 11)
        .writeAndApplyFont(`C7`, thuTien.soTien, 11)
        .writeAndApplyFont(`C8`, numberToVietnameseWords(thuTien.soTien), 11)
        .writeAndApplyFont(`C9`, thuTien.lyDo, 11)
        .writeAndApplyFont(`C10`, thuTien.noiNhan, 11)

    const output = await excel.createOutput()

    revalidatePath(`/cong-no`)
    return {
      fileName: `ptt-TN${formatSoPhieu(thuTien.soPhieu)}-${customerCode}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
      soPhieu: thuTien.soPhieu,
    }
  } catch (error) {
    return fail(error)
  }
}

export async function createCongNo(data: {
  mskh: string
  tongTien: number
  noiDung: string
  ngay?: string
}) {
  await requireSession()

  const customerCode = data.mskh?.trim()
  if (!customerCode) {
    return { error: `Khách hàng là bắt buộc` }
  }

  if (!Number.isInteger(data.tongTien) || data.tongTien <= 0) {
    return { error: `Tổng tiền phải là số nguyên lớn hơn 0` }
  }

  const noiDung = (data.noiDung || ``).trim()
  if (!noiDung) {
    return { error: `Nội dung là bắt buộc` }
  }

  try {
    const customer = await prisma.khachHang.findUnique({
      where: { mskh: customerCode },
    })

    if (!customer) {
      return { error: `Không tìm thấy thông tin khách hàng` }
    }

    const ngayDate = data.ngay ? new Date(data.ngay) : new Date()

    const congNo = await prisma.congNo.create({
      data: {
        mskh: customerCode,
        tongTien: data.tongTien,
        noiDung,
        ngay: ngayDate,
      },
    })

    revalidatePath(`/cong-no`)
    return {
      id: congNo.id,
      success: true,
    }
  } catch (error) {
    return fail(error)
  }
}

export async function listThuTien(search = ``, page = 1, pageSize = 10) {
  await requireSession()

  const query = search.trim()
  const isNumeric = /^\d+$/.test(query)
  const where: Prisma.ThuTienWhereInput | undefined = query
    ? {
        OR: [
          ...(isNumeric ? [{ soPhieu: Number(query) }, { soTien: Number(query) }] : []),
          { mskh: { contains: query, mode: `insensitive` } },
          { lyDo: { contains: query, mode: `insensitive` } },
          { noiNhan: { contains: query, mode: `insensitive` } },
          {
            khachHang: {
              OR: [
                { ten: { contains: query, mode: `insensitive` } },
                { tenCongTy: { contains: query, mode: `insensitive` } },
              ],
            },
          },
        ],
      }
    : undefined

  const [rows, total] = await Promise.all([
    prisma.thuTien.findMany({
      where,
      include: {
        khachHang: {
          select: {
            mskh: true,
            ten: true,
            tenCongTy: true,
            soDienThoai: true,
            tinh: true,
          },
        },
      },
      orderBy: { soPhieu: `desc` },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.thuTien.count({ where }),
  ])

  const items = rows.map((row) => ({
    soPhieu: row.soPhieu,
    mskh: row.mskh,
    tenKhachHang: row.khachHang.ten,
    tenCongTy: row.khachHang.tenCongTy,
    soTien: row.soTien,
    lyDo: row.lyDo,
    noiNhan: row.noiNhan,
    ngayThu: row.ngayThu.toISOString(),
  }))

  return { items, total }
}

export type BangCongNoRow = {
  id: string
  type: `xuat_hang` | `thu_tien` | `cong_no`
  ngay: string
  soPhieu: string
  tenKhachHang: string
  tenCongTy: string | null
  mssp: string | null
  tenThuongMai: string | null
  quyCach: string | null
  quyCachThung: number | null
  soLuongThung: number | null
  soHangLe: number | null
  donGia: number | null
  tongTien: number | null
  giaNguyenLieu: number | null
  giaVatTu: number | null
  traTien: number | null
  ghiChu: string | null
}

export type BangCongNoResult = {
  items: BangCongNoRow[]
  congNo: number
  congNoDauKy: number
  totalTongTien: number
  totalTraTien: number
  error?: string
}

export async function getBangCongNo({
  mskh,
  startDate,
  endDate,
}: {
  mskh?: string
  startDate: string
  endDate: string
}): Promise<BangCongNoResult> {
  await requireSession()

  const startStr = startDate?.trim()
  const endStr = endDate?.trim()

  if (!startStr || !endStr) {
    return {
      items: [],
      congNo: 0,
      congNoDauKy: 0,
      totalTongTien: 0,
      totalTraTien: 0,
      error: `Ngày bắt đầu và ngày kết thúc là bắt buộc`,
    }
  }

  const start = new Date(`${startStr}T00:00:00`)
  const end = new Date(`${endStr}T23:59:59.999`)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      items: [],
      congNo: 0,
      congNoDauKy: 0,
      totalTongTien: 0,
      totalTraTien: 0,
      error: `Ngày không hợp lệ`,
    }
  }

  const customerCode = mskh?.trim() || undefined

  let customerCodes: string[] | undefined = undefined
  if (customerCode) {
    const daiLyList = await prisma.khachHang.findMany({
      where: { quanLyMskh: customerCode },
      select: { mskh: true },
    })
    customerCodes = [customerCode, ...daiLyList.map((d) => d.mskh)]
  }

  const xuatHangWhere: Prisma.XuatHangWhereInput = {
    ngayXuatHang: {
      gte: start,
      lte: end,
    },
    ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
  }

  const thuTienWhere: Prisma.ThuTienWhereInput = {
    ngayThu: {
      gte: start,
      lte: end,
    },
    ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
  }

  const congNoWhere: Prisma.CongNoWhereInput = {
    ngay: {
      gte: start,
      lte: end,
    },
    ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
  }

  const xuatHangDauKyWhere: Prisma.XuatHangSanPhamWhereInput = {
    xuatHang: {
      ngayXuatHang: { lt: start },
      ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
    },
  }

  const congNoDauKyWhere: Prisma.CongNoWhereInput = {
    ngay: { lt: start },
    ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
  }

  const thuTienDauKyWhere: Prisma.ThuTienWhereInput = {
    ngayThu: { lt: start },
    ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
  }

  try {
    const [
      xuatHangList,
      thuTienList,
      congNoList,
      xuatHangDauKySum,
      congNoDauKySum,
      thuTienDauKySum,
    ] = await Promise.all([
      prisma.xuatHang.findMany({
        where: xuatHangWhere,
        include: {
          khachHang: {
            include: {
              quanLy: true,
            },
          },
          sanPham: {
            orderBy: { mssp: `asc` },
          },
        },
        orderBy: { ngayXuatHang: `asc` },
      }),
      prisma.thuTien.findMany({
        where: thuTienWhere,
        include: {
          khachHang: {
            include: {
              quanLy: true,
            },
          },
        },
        orderBy: { ngayThu: `asc` },
      }),
      prisma.congNo.findMany({
        where: congNoWhere,
        include: {
          khachHang: {
            include: {
              quanLy: true,
            },
          },
        },
        orderBy: { ngay: `asc` },
      }),
      prisma.xuatHangSanPham.aggregate({
        where: xuatHangDauKyWhere,
        _sum: {
          tongTien: true,
        },
      }),
      prisma.congNo.aggregate({
        where: congNoDauKyWhere,
        _sum: {
          tongTien: true,
        },
      }),
      prisma.thuTien.aggregate({
        where: thuTienDauKyWhere,
        _sum: {
          soTien: true,
        },
      }),
    ])

    const allMssp = Array.from(new Set(xuatHangList.flatMap((xh) => xh.sanPham.map((sp) => sp.mssp))))
    const productsInfo = allMssp.length > 0
      ? await prisma.sanPham.findMany({
          where: { mssp: { in: allMssp } },
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
      : []
    const productInfoMap = new Map(productsInfo.map((p) => [p.mssp, p]))

    const rows: BangCongNoRow[] = []

    for (const xh of xuatHangList) {
      for (const sp of xh.sanPham) {
        const pInfo = productInfoMap.get(sp.mssp)
        let giaNguyenLieu: number | null = null
        let giaVatTu: number | null = null

        if (pInfo) {
          const quyCachThung = sp.quyCachThung ?? pInfo.quyCachThung
          const soHangLe = sp.soHangLe ?? 0
          const totalUnits = sp.soLuongThung * quyCachThung + soHangLe

          let nlTotal = 0
          const totalMass = totalUnits * (pInfo.khoiLuong || 0)
          const totalCongThuc = pInfo.nguyenLieu.reduce((s, c) => s + Number(c.dinhLuong), 0)
          for (const cnl of pInfo.nguyenLieu) {
            const donGia = cnl.nguyenLieu.gia[0]?.donGia ?? 0
            const qty = totalCongThuc > 0 ? (totalMass / totalCongThuc) * Number(cnl.dinhLuong) : 0
            nlTotal += Math.round(qty * donGia)
          }
          giaNguyenLieu = nlTotal

          let vtTotal = 0
          for (const spvt of pInfo.vatTu) {
            const donGia = spvt.vatTu.gia[0]?.donGia ?? 0
            const qty = spvt.vatTu.loai === `THUNG` ? sp.soLuongThung : totalUnits
            vtTotal += qty * donGia
          }
          giaVatTu = vtTotal
        }

        const khachHang = xh.khachHang.quanLyMskh ? xh.khachHang.quanLy : xh.khachHang
        const ghiChu = xh.khachHang.quanLyMskh ? xh.khachHang.ten : null

        rows.push({
          id: `xh-${xh.soPhieu}-${sp.mssp}`,
          type: `xuat_hang`,
          ngay: xh.ngayXuatHang.toISOString(),
          soPhieu: `XH26${formatSoPhieu(xh.soPhieu)}`,
          tenKhachHang: khachHang?.ten || xh.khachHang.ten,
          tenCongTy: khachHang?.tenCongTy || xh.khachHang.tenCongTy,
          mssp: sp.mssp,
          tenThuongMai: sp.tenThuongMai ?? null,
          quyCach: sp.quyCach ?? null,
          quyCachThung: sp.quyCachThung ?? null,
          donGia: sp.donGia ?? null,
          soLuongThung: sp.soLuongThung,
          soHangLe: sp.soHangLe,
          tongTien: sp.tongTien ?? null,
          giaNguyenLieu,
          giaVatTu,
          traTien: null,
          ghiChu,
        })
      }
    }

    for (const tt of thuTienList) {
      const khachHang = tt.khachHang.quanLyMskh ? tt.khachHang.quanLy : tt.khachHang
      const ghiChu = tt.khachHang.quanLyMskh ? tt.khachHang.ten : null

      rows.push({
        id: `tt-${tt.soPhieu}`,
        type: `thu_tien`,
        ngay: tt.ngayThu.toISOString(),
        soPhieu: `TN26${formatSoPhieu(tt.soPhieu)}`,
        tenKhachHang: khachHang?.ten || tt.khachHang.ten,
        tenCongTy: khachHang?.tenCongTy || tt.khachHang.tenCongTy,
        mssp: null,
        tenThuongMai: null,
        quyCach: null,
        quyCachThung: null,
        donGia: null,
        soLuongThung: null,
        soHangLe: null,
        tongTien: null,
        giaNguyenLieu: null,
        giaVatTu: null,
        traTien: tt.soTien,
        ghiChu,
      })
    }

    for (const cn of congNoList) {
      const khachHang = cn.khachHang.quanLyMskh ? cn.khachHang.quanLy : cn.khachHang
      const ghiChu = cn.khachHang.quanLyMskh
        ? `${cn.khachHang.ten} - ${cn.noiDung}`
        : cn.noiDung

      rows.push({
        id: `cn-${cn.id}`,
        type: `cong_no`,
        ngay: cn.ngay.toISOString(),
        soPhieu: `CN26${formatSoPhieu(cn.id)}`,
        tenKhachHang: khachHang?.ten || cn.khachHang.ten,
        tenCongTy: khachHang?.tenCongTy || cn.khachHang.tenCongTy,
        mssp: null,
        tenThuongMai: null,
        quyCach: null,
        quyCachThung: null,
        donGia: null,
        soLuongThung: null,
        soHangLe: null,
        tongTien: cn.tongTien,
        giaNguyenLieu: null,
        giaVatTu: null,
        traTien: null,
        ghiChu,
      })
    }

    rows.sort((a, b) => {
      const timeA = new Date(a.ngay).getTime()
      const timeB = new Date(b.ngay).getTime()
      if (timeA !== timeB) return timeA - timeB
      return a.soPhieu.localeCompare(b.soPhieu)
    })

    const congNoDauKy =
      (xuatHangDauKySum._sum.tongTien ?? 0) +
      (congNoDauKySum._sum.tongTien ?? 0) -
      (thuTienDauKySum._sum.soTien ?? 0)

    const totalTongTien = rows.reduce((sum, r) => sum + (r.tongTien ?? 0), 0)
    const totalTraTien = rows.reduce((sum, r) => sum + (r.traTien ?? 0), 0)
    const congNo = totalTongTien - totalTraTien

    return {
      items: rows,
      congNo,
      congNoDauKy,
      totalTongTien,
      totalTraTien,
    }
  } catch (error) {
    return {
      items: [],
      congNo: 0,
      congNoDauKy: 0,
      totalTongTien: 0,
      totalTraTien: 0,
      error: error instanceof Error ? error.message : `Không thể tải bảng công nợ`,
    }
  }
}

export async function exportCongNoExcel(mskh: string | undefined, startDate: string, endDate: string) {
  await requireSession()

  try {
    const [excel, bangCongNo] = await Promise.all([
      Excel.loadTemplate(`bangcongno.xlsx`),
      getBangCongNo({
        mskh,
        startDate,
        endDate,
      }),
    ])

    if ('error' in excel) {
      return { error: excel.error }
    }

    if ('error' in bangCongNo) {
      return { error: bangCongNo.error }
    }
    const startDateStr = formatDateTime(new Date(startDate)).slice(0, 10)
    const endDateStr = formatDateTime(new Date(endDate)).slice(0, 10)
    excel
        .writeAndApplyFont(`I2`, formatPrice(bangCongNo.congNo), 11)
        .writeAndApplyFont(`G2`, formatPrice(bangCongNo.congNoDauKy), 11)
        .writeAndApplyFont(`E2`, `${startDateStr} - ${endDateStr}`, 11)
    let rowIndex = 4
    bangCongNo.items.forEach((row, index) => {
      excel
          .writeAndApplyFont(`A${rowIndex}`, index + 1, 11)
          .writeAndApplyFont(`B${rowIndex}`, formatDateTime(new Date(row.ngay)), 11)
          .writeAndApplyFont(`C${rowIndex}`, row.soPhieu, 11)
          .writeAndApplyFont(`D${rowIndex}`, row.tenKhachHang, 11)
          .writeAndApplyFont(`E${rowIndex}`, row.tenCongTy || '', 11)
          .writeAndApplyFont(`F${rowIndex}`, row.mssp || '', 11)
          .writeAndApplyFont(`G${rowIndex}`, row.tenThuongMai || '', 11)
          .writeAndApplyFont(`H${rowIndex}`, row.quyCach || '', 11)
          .writeAndApplyFont(`I${rowIndex}`, row.quyCachThung || '', 11)
          .writeAndApplyFont(`J${rowIndex}`, row.donGia || '', 11)
          .writeAndApplyFont(`K${rowIndex}`, row.soLuongThung || '', 11)
          .writeAndApplyFont(`L${rowIndex}`, row.soHangLe || '', 11)
          .writeAndApplyFont(`M${rowIndex}`, row.tongTien || '', 11)
          .writeAndApplyFont(`N${rowIndex}`, row.traTien || '', 11)
          .writeAndApplyFont(`O${rowIndex}`, row.ghiChu || '', 11)
      for (let i = 'A'.charCodeAt(0) ; i <= 'O'.charCodeAt(0) ; i++) {
        excel
            .applyBorder(`${String.fromCharCode(i)}${rowIndex}`)
      }
      rowIndex++
    })
    const output = await excel.createOutput()
    return {
      fileName: `bangcongno-${startDateStr.replaceAll('/', '')}-${endDateStr.replaceAll('/', '')}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
    }
  } catch (error) {
    return fail(error)
  }
}
