"use client"

import { useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
  type BarShapeProps,
} from "recharts"
import { DoanhSoChartItem } from "@/lib/actions/doanh-so/data"
import { formatPrice } from "@/lib/utils"
import DoanhSoTooltip from "./tooltip"

export default function RevenueChartSection({
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
                  tickFormatter={(value: number) => formatPrice(value, true)}
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
                <Tooltip content={<DoanhSoTooltip />} cursor={{ fill: "#f4f4f5" }} />
                <Bar
                  dataKey="tongTien"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={32}
                  shape={(props: BarShapeProps) => (
                    <Rectangle {...props} fill={colors[props.index % colors.length]} />
                  )}
                />
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
