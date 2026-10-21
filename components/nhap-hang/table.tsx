"use client"

import { use } from "react"
import { formatDateTime, formatPrice } from "@/lib/utils"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { NhapHangItem } from "./form"

export default function NhapHangTable({
  dataPromise,
  page,
  onPageChange,
}: {
  dataPromise: Promise<{ items: NhapHangItem[]; total: number }>
  page: number
  onPageChange: (newPage: number) => void
}) {
  const { items, total } = use(dataPromise)
  const pageCount = Math.max(1, Math.ceil(total / 10))

  function getLoaiLabel(loai: "NGUYEN_LIEU" | "VAT_TU") {
    return loai === "NGUYEN_LIEU" ? "Nguyên liệu" : "Vật tư"
  }

  return (
    <>
      <table className="w-full min-w-200 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            <th className="px-3 py-2 sm:px-6 font-semibold">Ngày nhập</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Loại</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Mã hàng nhập</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Số lượng</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Đơn giá</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Tổng tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                Không có phiếu nhập hàng nào
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 sm:px-6">
                  {formatDateTime(new Date(item.ngayNhap))}
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.loai === "NGUYEN_LIEU"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {getLoaiLabel(item.loai)}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900 sm:px-6">
                  {item.maHangNhap}
                </td>
                <td className="px-3 py-2 sm:px-6">
                  {formatPrice(item.soLuong)}
                </td>
                <td className="px-3 py-2 sm:px-6">
                  {formatPrice(item.donGia)}
                </td>
                <td className="px-3 py-2 font-medium sm:px-6">
                  {formatPrice(item.tongTien)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pageCount > 1 && (
        <div className="border-t border-zinc-100 p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Trước"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1) onPageChange(page - 1)
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-sm text-zinc-600">
                  Trang {page} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Sau"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < pageCount) onPageChange(page + 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}
