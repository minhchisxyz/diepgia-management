"use client"

import { use, useEffect, useMemo, useState } from "react"
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
  type SortKey = keyof NhapHangItem
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "ngayNhap", direction: "desc" })
  const [localPage, setLocalPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    setLocalPage(1)
  }, [items])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison: number
      if (sort.key === "ngayNhap") {
        comparison = new Date(a.ngayNhap).getTime() - new Date(b.ngayNhap).getTime()
      } else if (typeof a[sort.key] === "number" && typeof b[sort.key] === "number") {
        comparison = (a[sort.key] as number) - (b[sort.key] as number)
      } else {
        const left = String(a[sort.key] ?? "").toLocaleLowerCase()
        const right = String(b[sort.key] ?? "").toLocaleLowerCase()
        comparison = left.localeCompare(right, "vi", { numeric: true })
      }
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [items, sort])

  const totalItems = sortedItems.length
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(1, localPage), pageCount)

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedItems.slice(start, start + pageSize)
  }, [sortedItems, currentPage, pageSize])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    )
    setLocalPage(1)
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ⇅"
  }

  function getLoaiLabel(loai: "NGUYEN_LIEU" | "VAT_TU") {
    return loai === "NGUYEN_LIEU" ? "Nguyên liệu" : "Vật tư"
  }

  return (
    <>
      <table className="w-full min-w-200 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            <th onClick={() => toggleSort("ngayNhap")} className="px-3 py-2 sm:px-6 font-semibold cursor-pointer select-none hover:bg-zinc-200">Ngày nhập{sortLabel("ngayNhap")}</th>
            <th onClick={() => toggleSort("loai")} className="px-3 py-2 sm:px-6 font-semibold cursor-pointer select-none hover:bg-zinc-200">Loại{sortLabel("loai")}</th>
            <th onClick={() => toggleSort("maHangNhap")} className="px-3 py-2 sm:px-6 font-semibold cursor-pointer select-none hover:bg-zinc-200">Mã hàng nhập{sortLabel("maHangNhap")}</th>
            <th onClick={() => toggleSort("soLuong")} className="px-3 py-2 sm:px-6 font-semibold cursor-pointer select-none hover:bg-zinc-200">Số lượng{sortLabel("soLuong")}</th>
            <th onClick={() => toggleSort("donGia")} className="px-3 py-2 sm:px-6 font-semibold cursor-pointer select-none hover:bg-zinc-200">Đơn giá{sortLabel("donGia")}</th>
            <th onClick={() => toggleSort("tongTien")} className="px-3 py-2 sm:px-6 font-semibold cursor-pointer select-none hover:bg-zinc-200">Tổng tiền{sortLabel("tongTien")}</th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                Không có phiếu nhập hàng nào
              </td>
            </tr>
          ) : (
            paginatedItems.map((item) => (
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
                    if (currentPage > 1) { setLocalPage(currentPage - 1); onPageChange?.(currentPage - 1); }
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-sm text-zinc-600">
                  Trang {currentPage} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Sau"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < pageCount) { setLocalPage(currentPage + 1); onPageChange?.(currentPage + 1); }
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
