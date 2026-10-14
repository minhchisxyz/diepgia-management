'use server'

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/app/actions/users/data"
import path from "node:path"
import ExcelJS from "exceljs"
import { fail, formatDateTime } from "@/lib/utils"

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

    const templatePath = path.join(process.cwd(), `public`, `ptt.xlsx`)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(templatePath)
    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      return { error: `Không thể đọc file mẫu phiếu thu tiền` }
    }

    worksheet.getCell(`G1`).value = thuTien.soPhieu
    worksheet.getCell(`H1`).value = ``
    worksheet.getCell(`G2`).value = formatDateTime(thuTien.ngayThu)
    worksheet.getCell(`H2`).value = ``

    worksheet.getCell(`C5`).value = customer.ten
    worksheet.getCell(`E5`).value = customer.soDienThoai ?? ``
    worksheet.getCell(`H5`).value = customer.tinh
    worksheet.getCell(`C6`).value = customer.tenCongTy ?? ``
    worksheet.getCell(`C7`).value = thuTien.soTien
    worksheet.getCell(`C8`).value = thuTien.lyDo
    worksheet.getCell(`C10`).value = thuTien.noiNhan

    const output = await workbook.xlsx.writeBuffer()

    revalidatePath(`/cong-no`)
    return {
      fileName: `ptt-${thuTien.soPhieu}-${customerCode}.xlsx`,
      data: Buffer.from(output as unknown as Uint8Array).toString(`base64`),
      soPhieu: thuTien.soPhieu,
    }
  } catch (error) {
    return fail(error)
  }
}

export const CreateThuTien = createThuTien

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
  type: `xuat_hang` | `thu_tien`
  ngay: string
  soPhieu: number
  tenKhachHang: string
  tenCongTy: string | null
  mssp: string | null
  tenThuongMai: string | null
  quyCach: string | null
  quyCachThung: number | null
  donGia: number | null
  soLuongThung: number | null
  soHangLe: number | null
  giaTien: number | null
  traTien: number | null
}

export type BangCongNoResult = {
  items: BangCongNoRow[]
  congNo: number
  totalGiaTien: number
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
      totalGiaTien: 0,
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
      totalGiaTien: 0,
      totalTraTien: 0,
      error: `Ngày không hợp lệ`,
    }
  }

  const customerCode = mskh?.trim() || undefined

  const xuatHangWhere: Prisma.XuatHangWhereInput = {
    ngayXuatHang: {
      gte: start,
      lte: end,
    },
    ...(customerCode ? { mskh: customerCode } : {}),
  }

  const thuTienWhere: Prisma.ThuTienWhereInput = {
    ngayThu: {
      gte: start,
      lte: end,
    },
    ...(customerCode ? { mskh: customerCode } : {}),
  }

  try {
    const [xuatHangList, thuTienList] = await Promise.all([
      prisma.xuatHang.findMany({
        where: xuatHangWhere,
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
              sanPham: {
                select: {
                  mssp: true,
                  tenThuongMai: true,
                  quyCach: true,
                  quyCachThung: true,
                  donGia: true,
                },
              },
            },
            orderBy: { mssp: `asc` },
          },
        },
        orderBy: { ngayXuatHang: `asc` },
      }),
      prisma.thuTien.findMany({
        where: thuTienWhere,
        include: {
          khachHang: {
            select: {
              mskh: true,
              ten: true,
              tenCongTy: true,
            },
          },
        },
        orderBy: { ngayThu: `asc` },
      }),
    ])

    const rows: BangCongNoRow[] = []

    for (const xh of xuatHangList) {
      for (const sp of xh.sanPham) {
        const quyCachThung = sp.sanPham?.quyCachThung ?? 0
        const donGia = sp.sanPham?.donGia ?? 0
        const calculatedGiaTien = (sp.soLuongThung * quyCachThung + sp.soHangLe) * donGia
        const giaTien = sp.giaTien || calculatedGiaTien

        rows.push({
          id: `xh-${xh.soPhieu}-${sp.mssp}`,
          type: `xuat_hang`,
          ngay: xh.ngayXuatHang.toISOString(),
          soPhieu: xh.soPhieu,
          tenKhachHang: xh.khachHang.ten,
          tenCongTy: xh.khachHang.tenCongTy,
          mssp: sp.mssp,
          tenThuongMai: sp.sanPham?.tenThuongMai ?? null,
          quyCach: sp.sanPham?.quyCach ?? null,
          quyCachThung: sp.sanPham?.quyCachThung ?? null,
          donGia: sp.sanPham?.donGia ?? null,
          soLuongThung: sp.soLuongThung,
          soHangLe: sp.soHangLe,
          giaTien,
          traTien: null,
        })
      }
    }

    for (const tt of thuTienList) {
      rows.push({
        id: `tt-${tt.soPhieu}`,
        type: `thu_tien`,
        ngay: tt.ngayThu.toISOString(),
        soPhieu: tt.soPhieu,
        tenKhachHang: tt.khachHang.ten,
        tenCongTy: tt.khachHang.tenCongTy,
        mssp: null,
        tenThuongMai: null,
        quyCach: null,
        quyCachThung: null,
        donGia: null,
        soLuongThung: null,
        soHangLe: null,
        giaTien: null,
        traTien: tt.soTien,
      })
    }

    rows.sort((a, b) => {
      const timeA = new Date(a.ngay).getTime()
      const timeB = new Date(b.ngay).getTime()
      if (timeA !== timeB) return timeA - timeB
      return a.soPhieu - b.soPhieu
    })

    const totalGiaTien = rows.reduce((sum, r) => sum + (r.giaTien ?? 0), 0)
    const totalTraTien = rows.reduce((sum, r) => sum + (r.traTien ?? 0), 0)
    const congNo = totalGiaTien - totalTraTien

    return {
      items: rows,
      congNo,
      totalGiaTien,
      totalTraTien,
    }
  } catch (error) {
    return {
      items: [],
      congNo: 0,
      totalGiaTien: 0,
      totalTraTien: 0,
      error: error instanceof Error ? error.message : `Không thể tải bảng công nợ`,
    }
  }
}
