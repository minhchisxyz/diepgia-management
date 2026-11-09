"use client"

import { use } from "react"
import { DoanhSoData } from "@/lib/actions/doanh-so/data"
import { formatPrice } from "@/lib/utils"
import RevenueChartSection from "./chart-section"

const COLORS_PHAN_BON = [
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#1d4ed8",
  "#0284c7",
  "#0ea5e9",
  "#38bdf8",
  "#0369a1",
]

const COLORS_THUONG_MAI = [
  "#059669",
  "#10b981",
  "#34d399",
  "#047857",
  "#0d9488",
  "#14b8a6",
  "#2dd4bf",
  "#0f766e",
]

const COLORS_KHACH_HANG = [
  "#7c3aed",
  "#8b5cf6",
  "#a78bfa",
  "#6d28d9",
  "#9333ea",
  "#a855f7",
  "#c084fc",
  "#5b21b6",
]

export default function DoanhSoCharts({
  dataPromise,
  periodLabel,
}: {
  dataPromise: Promise<DoanhSoData>
  periodLabel: string
}) {
  const data = use(dataPromise)

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Tổng doanh thu ({periodLabel})</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
            {formatPrice(data.totalRevenue)} đ
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Tổng số phiếu xuất</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
            {formatPrice(data.totalOrders)} phiếu
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Tổng số lượng thùng xuất</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
            {formatPrice(data.totalBoxes)} thùng
          </p>
        </div>
      </section>

      {/* Graph 1: By tenPhanBon */}
      <RevenueChartSection
        title="1. Doanh số theo Tên phân bón"
        description="Tổng doanh thu theo từng loại phân bón"
        items={data.byTenPhanBon}
        colors={COLORS_PHAN_BON}
        totalRevenue={data.totalRevenue}
      />

      {/* Graph 2: By tenPhanBon and tenThuongMai */}
      <RevenueChartSection
        title="2. Doanh số theo Tên phân bón & Tên thương mại"
        description="Tổng doanh thu nhóm theo Tên phân bón và Tên thương mại"
        items={data.byTenPhanBonAndTenThuongMai}
        colors={COLORS_THUONG_MAI}
        totalRevenue={data.totalRevenue}
      />

      {/* Graph 3: By khachHang */}
      <RevenueChartSection
        title="3. Doanh số theo Khách hàng"
        description="Tổng doanh thu theo từng Khách hàng"
        items={data.byKhachHang}
        colors={COLORS_KHACH_HANG}
        totalRevenue={data.totalRevenue}
      />
    </div>
  )
}
