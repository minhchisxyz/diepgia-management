"use client"

import { DoanhSoChartItem } from "@/lib/actions/doanh-so/data"
import { formatPrice } from "@/lib/utils"

export default function DoanhSoTooltip({
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
      <p className="text-sm font-semibold text-zinc-900 wrap-break-word">{item.label}</p>
      {item.subLabel && (
        <p className="mt-0.5 text-xs text-zinc-500 wrap-break-word">{item.subLabel}</p>
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
