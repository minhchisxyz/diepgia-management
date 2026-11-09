"use client"

import { useState, useTransition } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  DoanhSoChartItem,
  DoanhSoData,
  DoanhSoFilterMode,
  getDoanhSoData,
} from "@/lib/actions/doanh-so/data"
import { formatPrice } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

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

function formatCompactVND(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`
  }
  return String(value)
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: DoanhSoChartItem }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload

  return (
    <div className="max-w-xs rounded-xl border border-zinc-200 bg-white p-3.5 shadow-lg">
      <p className="text-sm font-semibold text-zinc-900 break-words">{item.label}</p>
      {item.subLabel && (
        <p className="mt-0.5 text-xs text-zinc-500 break-words">{item.subLabel}</p>
      )}
      <div className="mt-2.5 space-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
        <div className="flex items-center justify-between gap-4">
          <span>Doanh thu:</span>
          <span className="font-semibold text-zinc-900">{formatPrice(item.tongTien)} đ</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Số lượng thùng:</span>
          <span className="font-medium text-zinc-800">{formatPrice(item.soLuongThung)} thùng</span>
        </div>
        {item.soHangLe > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span>Số hàng lẻ:</span>
            <span className="font-medium text-zinc-800">{formatPrice(item.soHangLe)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span>Số phiếu xuất:</span>
          <span className="font-medium text-zinc-800">{item.soDon} phiếu</span>
        </div>
      </div>
    </div>
  )
}

function RevenueChartSection({
  title,
  description,
  items,
  colors,
  totalRevenue,
}: {
  title: string
  description: string
  items: DoanhSoChartItem[]
  colors: string[]
  totalRevenue: number
}) {
  const [showAllTable, setShowAllTable] = useState(false)
  const chartItems = items.slice(0, 15)
  const chartHeight = Math.max(320, chartItems.length * 44 + 60)
  const displayedTableItems = showAllTable ? items : items.slice(0, 5)

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">{title}</h2>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
        <span className="inline-flex items-center self-start rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 sm:self-auto">
          {items.length} mục
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center text-sm text-zinc-500">
          Không có dữ liệu xuất hàng trong khoảng thời gian đã chọn.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div style={{ width: "100%", height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartItems}
                layout="vertical"
                margin={{ top: 8, right: 32, left: 12, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e4e4e7" />
                <XAxis
                  type="number"
                  tickFormatter={formatCompactVND}
                  tick={{ fontSize: 12, fill: "#52525b" }}
                  axisLine={{ stroke: "#d4d4d8" }}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  width={190}
                  tick={{ fontSize: 12, fill: "#27272a" }}
                  axisLine={{ stroke: "#d4d4d8" }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f4f4f5" }} />
                <Bar dataKey="tongTien" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {chartItems.map((entry, index) => (
                    <Cell key={entry.key} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {items.length > 15 && (
            <p className="text-xs text-zinc-500 italic">
              * Biểu đồ hiển thị 15 mục có doanh số cao nhất. Xem bảng chi tiết bên dưới để tra cứu toàn bộ {items.length} mục.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
                <tr>
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3 text-right">Số phiếu</th>
                  <th className="px-4 py-3 text-right">Số thùng</th>
                  <th className="px-4 py-3 text-right">Tỷ trọng</th>
                  <th className="px-4 py-3 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {displayedTableItems.map((item, idx) => {
                  const share = totalRevenue > 0 ? ((item.tongTien / totalRevenue) * 100).toFixed(1) : "0.0"
                  return (
                    <tr key={item.key} className="hover:bg-zinc-50/80">
                      <td className="px-4 py-2.5 text-zinc-500">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-zinc-900">{item.label}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-600">{item.soDon}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-600">
                        {formatPrice(item.soLuongThung)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-zinc-600">{share}%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-zinc-900">
                        {formatPrice(item.tongTien)} đ
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {items.length > 5 && (
              <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllTable((prev) => !prev)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  {showAllTable
                    ? "Thu gọn bảng chi tiết"
                    : `Xem tất cả ${items.length} mục`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default function DoanhSoManager({
  initialData,
}: {
  initialData: DoanhSoData
}) {
  const [data, setData] = useState<DoanhSoData>(initialData)
  const [mode, setMode] = useState<DoanhSoFilterMode>(initialData.mode)
  const [year, setYear] = useState<number>(initialData.year)
  const [month, setMonth] = useState<number>(initialData.month)
  const [isPending, startTransition] = useTransition()

  function fetchUpdatedData(nextMode: DoanhSoFilterMode, nextYear: number, nextMonth: number) {
    startTransition(async () => {
      const result = await getDoanhSoData({
        mode: nextMode,
        year: nextYear,
        month: nextMonth,
      })
      setData(result)
    })
  }

  function handleModeChange(nextMode: DoanhSoFilterMode) {
    setMode(nextMode)
    fetchUpdatedData(nextMode, year, month)
  }

  function handleYearChange(nextYear: number) {
    setYear(nextYear)
    fetchUpdatedData(mode, nextYear, month)
  }

  function handleMonthChange(nextMonth: number) {
    setMonth(nextMonth)
    fetchUpdatedData(mode, year, nextMonth)
  }

  const periodLabel =
    mode === "month" ? `Tháng ${month}/${year}` : `Năm ${year}`

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header & Filter Controls */}
        <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
              Thống kê doanh số xuất hàng
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Tổng hợp doanh thu từ phiếu xuất hàng ({periodLabel})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isPending && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Spinner className="size-4" />
                <span>Đang tải...</span>
              </div>
            )}

            {/* Mode Toggle: Month vs Year */}
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => handleModeChange("month")}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition cursor-pointer ${
                  mode === "month"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Theo tháng
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("year")}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition cursor-pointer ${
                  mode === "year"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Theo năm
              </button>
            </div>

            {/* Month Selector (shown when mode === "month") */}
            {mode === "month" && (
              <select
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                disabled={isPending}
                aria-label="Chọn tháng"
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-2xs focus:outline-hidden disabled:opacity-50"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            )}

            {/* Year Selector */}
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              disabled={isPending}
              aria-label="Chọn năm"
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-2xs focus:outline-hidden disabled:opacity-50"
            >
              {data.availableYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        </section>

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
          description="Tổng doanh thu xuất hàng nhóm theo Tên phân bón"
          items={data.byTenPhanBon}
          colors={COLORS_PHAN_BON}
          totalRevenue={data.totalRevenue}
        />

        {/* Graph 2: By tenPhanBon and tenThuongMai */}
        <RevenueChartSection
          title="2. Doanh số theo Tên phân bón & Tên thương mại"
          description="Tổng doanh thu xuất hàng theo Tên phân bón và Tên thương mại"
          items={data.byTenPhanBonAndTenThuongMai}
          colors={COLORS_THUONG_MAI}
          totalRevenue={data.totalRevenue}
        />

        {/* Graph 3: By khachHang */}
        <RevenueChartSection
          title="3. Doanh số theo Khách hàng"
          description="Tổng doanh thu xuất hàng nhóm theo từng Khách hàng"
          items={data.byKhachHang}
          colors={COLORS_KHACH_HANG}
          totalRevenue={data.totalRevenue}
        />
      </div>
    </main>
  )
}
