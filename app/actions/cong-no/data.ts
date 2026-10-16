'use server'

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/app/actions/users/data"
import {fail, formatDateTime, formatSoPhieu, numberToVietnameseWords} from "@/lib/utils"
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
        .writeAndApplyFont(`H1`, `TN${formatSoPhieu(thuTien.soPhieu)}`, 11)
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
  soLuongThung: number | null
  soHangLe: number | null
  donGia: number | null
  tongTien: number | null
  giaNguyenLieu: number | null
  giaVatTu: number | null
  traTien: number | null
}

export type BangCongNoResult = {
  items: BangCongNoRow[]
  congNo: number
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
      totalTongTien: 0,
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
          for (const cnl of pInfo.nguyenLieu) {
            const donGia = cnl.nguyenLieu.gia[0]?.donGia ?? 0
            const qty = totalUnits * Number(cnl.giaTri)
            nlTotal += Math.round(qty * donGia)
          }
          giaNguyenLieu = nlTotal

          let vtTotal = 0
          for (const spvt of pInfo.vatTu) {
            const donGia = spvt.vatTu.gia[0]?.donGia ?? 0
            const qty = spvt.vatTu.ten === `THUNG` ? sp.soLuongThung : totalUnits
            vtTotal += qty * donGia
          }
          giaVatTu = vtTotal
        }

        rows.push({
          id: `xh-${xh.soPhieu}-${sp.mssp}`,
          type: `xuat_hang`,
          ngay: xh.ngayXuatHang.toISOString(),
          soPhieu: xh.soPhieu,
          tenKhachHang: xh.khachHang.ten,
          tenCongTy: xh.khachHang.tenCongTy,
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
        tongTien: null,
        giaNguyenLieu: null,
        giaVatTu: null,
        traTien: tt.soTien,
      })
    }

    rows.sort((a, b) => {
      const timeA = new Date(a.ngay).getTime()
      const timeB = new Date(b.ngay).getTime()
      if (timeA !== timeB) return timeA - timeB
      return a.soPhieu - b.soPhieu
    })

    const totalTongTien = rows.reduce((sum, r) => sum + (r.tongTien ?? 0), 0)
    const totalTraTien = rows.reduce((sum, r) => sum + (r.traTien ?? 0), 0)
    const congNo = totalTongTien - totalTraTien

    return {
      items: rows,
      congNo,
      totalTongTien,
      totalTraTien,
    }
  } catch (error) {
    return {
      items: [],
      congNo: 0,
      totalTongTien: 0,
      totalTraTien: 0,
      error: error instanceof Error ? error.message : `Không thể tải bảng công nợ`,
    }
  }
}
