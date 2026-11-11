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

  const lyDo = (data.lyDo || `Thu tiền hàng`).trim()
  if (!lyDo) {
    return { error: `Lý do thu là bắt buộc` }
  }

  const noiNhan = (data.noiNhan || `Chuyển khoản`).trim()
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

    const today = new Date()
    const ngayThuDate = data.ngayThu
      ? new Date(`${data.ngayThu.trim()}T00:00:00`)
      : today
    ngayThuDate.setHours(today.getHours(), today.getMinutes(), today.getSeconds(), today.getMilliseconds())

    const thuTien = await prisma.thuTien.create({
      data: {
        mskh: customerCode,
        soTien: data.soTien,
        lyDo,
        noiNhan,
        ngayThu: ngayThuDate,
      },
    })

    const res = await exportThuTienExcel(thuTien.soPhieu)

    revalidatePath(`/cong-no`)
    return res
  } catch (error) {
    return fail(error)
  }
}

export async function exportThuTienExcel(soPhieu: number) {
  await requireSession()

  const [thuTien, excel] = await Promise.all([
    prisma.thuTien.findUnique({
      where: { soPhieu },
      include: {
        khachHang: true
      }
    }),
    Excel.loadTemplate(`ptt.xlsx`),
  ])

  if ('error' in excel) {
    return { error: excel.error }
  }
  if (!thuTien) {
    return {error: `Không tìm thấy phiếu thu tiền ${soPhieu}`}
  }
  const customer = thuTien.khachHang
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

  return {
    fileName: `ptt-TN${formatSoPhieu(thuTien.soPhieu)}-${customer.mskh}.xlsx`,
    data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
    soPhieu: thuTien.soPhieu,
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
    const today = new Date()
    ngayDate.setHours(today.getHours(), today.getMinutes(), today.getSeconds(), today.getMilliseconds())

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

export type ThuTienSortKey = "ngayThu" | "soPhieu"

export type ThuTienRow = {
  soPhieu: number
  mskh: string
  tenKhachHang: string
  tenCongTy: string | null
  soTien: number
  lyDo: string
  noiNhan: string
  ngayThu: string
}

export type ListThuTienParams = {
  search?: string
  mskh?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  sort?: { key: ThuTienSortKey; direction: "asc" | "desc" }
}

export type ListThuTienResult = {
  items: ThuTienRow[]
  total: number
  totalSoTien: number
  error?: string
}

export async function listThuTien({
  search = ``,
  mskh,
  startDate,
  endDate,
  page = 1,
  pageSize = 10,
  sort = { key: "soPhieu", direction: "desc" },
}: ListThuTienParams = {}): Promise<ListThuTienResult> {
  await requireSession()

  try {
    const query = search.trim()
    const isNumeric = /^\d+$/.test(query)

    let start: Date | undefined = undefined
    let end: Date | undefined = undefined
    if (startDate?.trim()) {
      const s = new Date(`${startDate.trim()}T00:00:00`)
      if (!isNaN(s.getTime())) start = s
    }
    if (endDate?.trim()) {
      const e = new Date(`${endDate.trim()}T23:59:59.999`)
      if (!isNaN(e.getTime())) end = e
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

    const where: Prisma.ThuTienWhereInput = {
      ...(customerCodes ? { mskh: { in: customerCodes } } : {}),
      ...(start || end
        ? {
            ngayThu: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
      ...(query
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
        : {}),
    }

    const orderBy: Prisma.ThuTienOrderByWithRelationInput = sort
      ? { [sort.key]: sort.direction }
      : { soPhieu: `desc` }

    const [rows, total, sumResult] = await Promise.all([
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
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.thuTien.count({ where }),
      prisma.thuTien.aggregate({
        where,
        _sum: { soTien: true },
      }),
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

    return {
      items,
      total,
      totalSoTien: sumResult._sum.soTien ?? 0,
    }
  } catch (error) {
    return {
      items: [],
      total: 0,
      totalSoTien: 0,
      error: error instanceof Error ? error.message : `Không thể tải danh sách thu tiền`,
    }
  }
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
  total: number
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
  page,
  pageSize,
  sort,
}: {
  mskh?: string
  startDate: string
  endDate: string
  page?: number
  pageSize?: number
  sort?: { key: "ngay" | "soPhieu" | "tenKhachHang"; direction: "asc" | "desc" }
}): Promise<BangCongNoResult> {
  await requireSession()

  const startStr = startDate?.trim()
  const endStr = endDate?.trim()

  if (!startStr || !endStr) {
    return {
      items: [],
      total: 0,
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
      total: 0,
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
    donGia: { gt: 0 },
    tongTien: { gt: 0 },
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

    const rows: BangCongNoRow[] = []

    for (const xh of xuatHangList) {
      for (const sp of xh.sanPham) {
        const khachHang = xh.khachHang.quanLyMskh ? xh.khachHang.quanLy : xh.khachHang
        const ghiChuParts = [
          xh.khachHang.quanLyMskh ? xh.khachHang.ten : null,
          sp.ghiChu,
        ].filter(Boolean)
        const ghiChu = ghiChuParts.length > 0 ? ghiChuParts.join(" - ") : null

        rows.push({
          id: `xh-${xh.soPhieu}-${sp.id}`,
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
          giaNguyenLieu: null,
          giaVatTu: null,
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
      if (sort) {
        let comparison: number
        if (sort.key === "ngay") {
          comparison = new Date(a.ngay).getTime() - new Date(b.ngay).getTime()
          if (comparison === 0) comparison = a.soPhieu.localeCompare(b.soPhieu)
        } else if (sort.key === "soPhieu") {
          comparison = a.soPhieu.localeCompare(b.soPhieu, "vi", { numeric: true })
        } else {
          const strA = String(a[sort.key] ?? "").toLocaleLowerCase()
          const strB = String(b[sort.key] ?? "").toLocaleLowerCase()
          comparison = strA.localeCompare(strB, "vi", { numeric: true })
        }
        return sort.direction === "asc" ? comparison : -comparison
      }
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
    const total = rows.length

    const paginatedRows = pageSize
      ? rows.slice(((page ?? 1) - 1) * pageSize, ((page ?? 1) - 1) * pageSize + pageSize)
      : rows

    return {
      items: paginatedRows,
      total,
      congNo,
      congNoDauKy,
      totalTongTien,
      totalTraTien,
    }
  } catch (error) {
    return {
      items: [],
      total: 0,
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
