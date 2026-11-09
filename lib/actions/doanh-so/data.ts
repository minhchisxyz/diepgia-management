'use server'

import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/actions/users/data"

export type DoanhSoFilterMode = "month" | "year"

export type DoanhSoChartItem = {
  key: string
  label: string
  shortLabel: string
  tongTien: number
  soLuongThung: number
  soHangLe: number
  soDon: number
  subLabel?: string
}

export type DoanhSoData = {
  mode: DoanhSoFilterMode
  year: number
  month: number
  totalRevenue: number
  totalOrders: number
  totalBoxes: number
  availableYears: number[]
  byTenPhanBon: DoanhSoChartItem[]
  byTenPhanBonAndTenThuongMai: DoanhSoChartItem[]
  byKhachHang: DoanhSoChartItem[]
}

function getVietnamNow(): { year: number; month: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const year = Number(parts.find((p) => p.type === "year")?.value ?? new Date().getFullYear())
  const month = Number(parts.find((p) => p.type === "month")?.value ?? new Date().getMonth() + 1)
  return { year, month }
}

function getDateRange(mode: DoanhSoFilterMode, year: number, month: number): { start: Date; end: Date } {
  const pad = (n: number) => String(n).padStart(2, "0")
  if (mode === "year") {
    const start = new Date(`${year}-01-01T00:00:00.000+07:00`)
    const end = new Date(`${year}-12-31T23:59:59.999+07:00`)
    return { start, end }
  }

  const safeMonth = Math.min(12, Math.max(1, month))
  const lastDay = new Date(year, safeMonth, 0).getDate()
  const start = new Date(`${year}-${pad(safeMonth)}-01T00:00:00.000+07:00`)
  const end = new Date(`${year}-${pad(safeMonth)}-${pad(lastDay)}T23:59:59.999+07:00`)
  return { start, end }
}

function truncateLabel(text: string, maxLen = 28): string {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1)}…`
}

export async function getDoanhSoData(params?: {
  mode?: DoanhSoFilterMode
  year?: number
  month?: number
}): Promise<DoanhSoData> {
  await requireSession(true)

  const now = getVietnamNow()
  const mode: DoanhSoFilterMode = params?.mode ?? "month"
  const year = params?.year ?? now.year
  const month = params?.month ?? now.month

  const { start, end } = getDateRange(mode, year, month)

  const [orders, dateBounds] = await Promise.all([
    prisma.xuatHang.findMany({
      where: {
        ngayXuatHang: {
          gte: start,
          lte: end,
        },
      },
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
            tenPhanBon: true,
            tenThuongMai: true,
            soLuongThung: true,
            soHangLe: true,
            tongTien: true,
          },
        },
      },
      orderBy: {
        ngayXuatHang: "asc",
      },
    }),
    prisma.xuatHang.aggregate({
      _min: { ngayXuatHang: true },
      _max: { ngayXuatHang: true },
    }),
  ])

  const minYear = dateBounds._min.ngayXuatHang
    ? new Date(dateBounds._min.ngayXuatHang).getFullYear()
    : now.year - 2
  const maxYear = Math.max(
    now.year,
    year,
    dateBounds._max.ngayXuatHang ? new Date(dateBounds._max.ngayXuatHang).getFullYear() : now.year,
  )
  const startYear = Math.min(minYear, now.year - 2, year)
  const availableYears: number[] = []
  for (let y = maxYear; y >= startYear; y--) {
    availableYears.push(y)
  }

  const phanBonMap = new Map<
    string,
    { label: string; tongTien: number; soLuongThung: number; soHangLe: number; orders: Set<number> }
  >()
  const phanBonThuongMaiMap = new Map<
    string,
    {
      label: string
      subLabel: string
      tongTien: number
      soLuongThung: number
      soHangLe: number
      orders: Set<number>
    }
  >()
  const khachHangMap = new Map<
    string,
    {
      label: string
      subLabel: string
      tongTien: number
      soLuongThung: number
      soHangLe: number
      orders: Set<number>
    }
  >()

  let totalRevenue = 0
  let totalBoxes = 0

  for (const order of orders) {
    const khKey = order.mskh
    const khLabel = `${order.mskh} - ${order.khachHang.ten}`
    const khSubLabel = order.khachHang.tenCongTy || order.khachHang.ten

    for (const sp of order.sanPham) {
      const revenue = sp.tongTien ?? 0
      const boxes = sp.soLuongThung ?? 0
      const loose = sp.soHangLe ?? 0

      totalRevenue += revenue
      totalBoxes += boxes

      const tenPhanBon = sp.tenPhanBon?.trim() || "Chưa có tên phân bón"
      const tenThuongMai = sp.tenThuongMai?.trim() || sp.mssp

      // 1. Group by tenPhanBon
      const pbEntry = phanBonMap.get(tenPhanBon) ?? {
        label: tenPhanBon,
        tongTien: 0,
        soLuongThung: 0,
        soHangLe: 0,
        orders: new Set<number>(),
      }
      pbEntry.tongTien += revenue
      pbEntry.soLuongThung += boxes
      pbEntry.soHangLe += loose
      pbEntry.orders.add(order.soPhieu)
      phanBonMap.set(tenPhanBon, pbEntry)

      // 2. Group by tenPhanBon + tenThuongMai
      const pbtmKey = `${tenPhanBon}___${tenThuongMai}`
      const pbtmLabel = `${tenPhanBon} - ${tenThuongMai}`
      const pbtmEntry = phanBonThuongMaiMap.get(pbtmKey) ?? {
        label: pbtmLabel,
        subLabel: `Tên phân bón: ${tenPhanBon} | Tên thương mại: ${tenThuongMai}`,
        tongTien: 0,
        soLuongThung: 0,
        soHangLe: 0,
        orders: new Set<number>(),
      }
      pbtmEntry.tongTien += revenue
      pbtmEntry.soLuongThung += boxes
      pbtmEntry.soHangLe += loose
      pbtmEntry.orders.add(order.soPhieu)
      phanBonThuongMaiMap.set(pbtmKey, pbtmEntry)

      // 3. Group by khachHang
      const khEntry = khachHangMap.get(khKey) ?? {
        label: khLabel,
        subLabel: khSubLabel,
        tongTien: 0,
        soLuongThung: 0,
        soHangLe: 0,
        orders: new Set<number>(),
      }
      khEntry.tongTien += revenue
      khEntry.soLuongThung += boxes
      khEntry.soHangLe += loose
      khEntry.orders.add(order.soPhieu)
      khachHangMap.set(khKey, khEntry)
    }
  }

  const byTenPhanBon: DoanhSoChartItem[] = Array.from(phanBonMap.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      shortLabel: truncateLabel(item.label, 26),
      tongTien: item.tongTien,
      soLuongThung: item.soLuongThung,
      soHangLe: item.soHangLe,
      soDon: item.orders.size,
    }))
    .sort((a, b) => b.tongTien - a.tongTien)

  const byTenPhanBonAndTenThuongMai: DoanhSoChartItem[] = Array.from(phanBonThuongMaiMap.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      shortLabel: truncateLabel(item.label, 30),
      subLabel: item.subLabel,
      tongTien: item.tongTien,
      soLuongThung: item.soLuongThung,
      soHangLe: item.soHangLe,
      soDon: item.orders.size,
    }))
    .sort((a, b) => b.tongTien - a.tongTien)

  const byKhachHang: DoanhSoChartItem[] = Array.from(khachHangMap.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      shortLabel: truncateLabel(item.label, 28),
      subLabel: item.subLabel,
      tongTien: item.tongTien,
      soLuongThung: item.soLuongThung,
      soHangLe: item.soHangLe,
      soDon: item.orders.size,
    }))
    .sort((a, b) => b.tongTien - a.tongTien)

  return {
    mode,
    year,
    month,
    totalRevenue,
    totalOrders: orders.length,
    totalBoxes,
    availableYears,
    byTenPhanBon,
    byTenPhanBonAndTenThuongMai,
    byKhachHang,
  }
}
