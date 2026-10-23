"use client"

import { use, useMemo, useState } from "react"
import { BangCongNoRow } from "@/lib/actions/cong-no/data"
import { formatDateTime, formatPrice } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type SortKey = "ngay" | "soPhieu" | "tenKhachHang"

export default function CongNoTable({
  dataPromise,
  hasSearched = true,
}: {
  dataPromise: Promise<{ items: BangCongNoRow[]; congNo: number }>
  hasSearched?: boolean
}) {
  const { items } = use(dataPromise)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "ngay",
    direction: "desc",
  })

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison: number
      if (sort.key === "ngay") {
        comparison = new Date(a.ngay).getTime() - new Date(b.ngay).getTime()
      } else if (sort.key === "soPhieu") {
        comparison = a.soPhieu.localeCompare(b.soPhieu)
      } else {
        const strA = String(a[sort.key] ?? "").toLocaleLowerCase()
        const strB = String(b[sort.key] ?? "").toLocaleLowerCase()
        comparison = strA.localeCompare(strB, "vi")
      }
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [items, sort])

  const pageCount = Math.max(1, Math.ceil(sortedItems.length / pageSize))
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedItems.slice(start, start + pageSize)
  }, [sortedItems, page, pageSize])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    )
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ⇅"
  }

  return (
    <>
      <table className="w-full min-w-350 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("ngay")}
                className="font-semibold hover:text-zinc-900 whitespace-nowrap"
              >
                Ngày{sortLabel("ngay")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("soPhieu")}
                className="font-semibold hover:text-zinc-900 whitespace-nowrap"
              >
                Số hoá đơn{sortLabel("soPhieu")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("tenKhachHang")}
                className="font-semibold hover:text-zinc-900 whitespace-nowrap"
              >
                Tên khách hàng{sortLabel("tenKhachHang")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Tên công ty</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">MSSP</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Tên thương mại</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Quy cách</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Quy cách thùng</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Giá</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Tổng thùng</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Hàng lẻ</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Tổng tiền</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Giá nguyên liệu</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Giá vật tư</th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap">Trả tiền</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.length === 0 ? (
            <tr>
              <td colSpan={15} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                {hasSearched
                  ? "Không có dữ liệu công nợ trong khoảng thời gian này"
                  : "Vui lòng chọn khoảng thời gian và nhấn Tra để xem dữ liệu công nợ"}
              </td>
            </tr>
          ) : (
            paginatedItems.map((item) => (
              <tr key={item.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  {formatDateTime(new Date(item.ngay))}
                </td>
                <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">
                  {item.soPhieu}
                </td>
                <td className="px-3 py-2 sm:px-6">{item.tenKhachHang}</td>
                <td className="px-3 py-2 sm:px-6">{item.tenCongTy ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6 font-mono text-xs">{item.mssp ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{item.tenThuongMai ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{item.quyCach ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{item.quyCachThung ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  {item.donGia !== null ? `${formatPrice(item.donGia)} đ` : "—"}
                </td>
                <td className="px-3 py-2 sm:px-6">
                  {item.soLuongThung !== null ? item.soLuongThung : "—"}
                </td>
                <td className="px-3 py-2 sm:px-6">
                  {item.soHangLe !== null ? item.soHangLe : "—"}
                </td>
                <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900 whitespace-nowrap">
                  {item.tongTien !== null ? `${formatPrice(item.tongTien)} đ` : "—"}
                </td>
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  {item.giaNguyenLieu !== null ? `${formatPrice(item.giaNguyenLieu)} đ` : "—"}
                </td>
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  {item.giaVatTu !== null ? `${formatPrice(item.giaVatTu)} đ` : "—"}
                </td>
                <td className="px-3 py-2 sm:px-6 font-medium text-emerald-700 whitespace-nowrap">
                  {item.traTien !== null ? `${formatPrice(item.traTien)} đ` : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pageCount > 1 && (
        <Pagination className="p-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="Trước"
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) setPage(page - 1)
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm">
                {page} / {pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                text="Sau"
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < pageCount) setPage(page + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  )
}
