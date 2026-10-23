"use client"

import { use, useMemo, useState } from "react"
import { formatDateTime, formatPrice, formatSoPhieu } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExcelButton, InfoButton } from "@/components/buttons"

export type SanXuatNguyenLieu = {
  id: string
  tenNguyenLieu: string
  donGia: number
  dinhLuong: number
  tongTien: number
}

export type SanXuatSanPham = {
  mssp: string
  tenThuongMai: string | null
  tenPhanBon: string | null
  donGia: number
  tiTrong: number | null
  khoiLuong: number
  nguyenLieu: SanXuatNguyenLieu[]
}

export type SanXuatItem = {
  id: number
  mskh: string
  tenKhachHang: string
  tenCongTy: string | null
  ngaySanXuat: string
  mssp: string
  tenThuongMai: string | null
  tenPhanBon: string | null
  sanPham: SanXuatSanPham | null
}

export type SortKey = "id" | "tenKhachHang" | "mssp"

export default function SanXuatTable({
  dataPromise,
  page,
  onPageChange,
  onExportExcel,
}: {
  dataPromise: Promise<{ items: SanXuatItem[]; total: number }>
  page: number
  onPageChange: (newPage: number) => void
  onExportExcel?: (item: SanXuatItem) => void
}) {
  const { items, total } = use(dataPromise)

  const [selectedSanXuat, setSelectedSanXuat] = useState<SanXuatItem | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "id",
    direction: "desc",
  })

  const pageCount = Math.max(1, Math.ceil(total / 10))

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0
      if (sort.key === "id") {
        comparison = a.id - b.id
      } else {
        const left = String(a[sort.key] ?? "").toLocaleLowerCase()
        const right = String(b[sort.key] ?? "").toLocaleLowerCase()
        comparison = left.localeCompare(right, "vi")
      }
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [items, sort])

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

  function handleOpenDetails(item: SanXuatItem) {
    setSelectedSanXuat(item)
    setIsDetailsOpen(true)
  }

  function handleExportExcel(item: SanXuatItem) {
    if (onExportExcel) {
      onExportExcel(item)
    }
  }

  return (
    <>
      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-200">
            <DialogTitle className="text-xl font-bold text-zinc-900">
              Lệnh sản xuất #{selectedSanXuat ? `LSX${formatSoPhieu(selectedSanXuat.id)}` : ""}
            </DialogTitle>
            {selectedSanXuat && (
              <div className="flex items-center gap-2 pr-6">
                <ExcelButton onClick={() => handleExportExcel(selectedSanXuat)} />
              </div>
            )}
          </DialogHeader>

          {selectedSanXuat && (
            <div className="space-y-6 text-sm py-2">
              {/* Customer and General info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 border border-zinc-200">
                <div>
                  <p className="text-zinc-500 text-xs">Khách hàng</p>
                  <p className="font-semibold text-zinc-900">
                    {selectedSanXuat.mskh} - {selectedSanXuat.tenKhachHang}
                  </p>
                  {selectedSanXuat.tenCongTy && (
                    <p className="text-xs text-zinc-600 mt-0.5">{selectedSanXuat.tenCongTy}</p>
                  )}
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Ngày sản xuất</p>
                  <p className="font-semibold text-zinc-900">
                    {formatDateTime(new Date(selectedSanXuat.ngaySanXuat))}
                  </p>
                </div>
              </div>

              {/* SanPham Details */}
              {selectedSanXuat.sanPham ? (
                <div className="rounded-xl border border-zinc-200 p-4 space-y-4 bg-white shadow-xs">
                  <h3 className="font-semibold text-base text-zinc-900">Thông tin sản phẩm sản xuất</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-b border-zinc-200 pb-4">
                    <div>
                      <span className="text-xs text-zinc-500">Mã sản phẩm:</span>
                      <p className="font-bold text-zinc-900">{selectedSanXuat.sanPham.mssp}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Tên thương mại:</span>
                      <p className="font-medium text-zinc-900">
                        {selectedSanXuat.sanPham.tenThuongMai || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Tên phân bón:</span>
                      <p className="font-medium text-zinc-900">
                        {selectedSanXuat.sanPham.tenPhanBon || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Đơn giá:</span>
                      <p className="font-medium text-zinc-900">
                        {formatPrice(selectedSanXuat.sanPham.donGia)} đ
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Khối lượng / Thể tích:</span>
                      <p className="font-semibold text-emerald-700">
                        {formatPrice(selectedSanXuat.sanPham.khoiLuong)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Tỉ trọng:</span>
                      <p className="font-medium text-zinc-900">
                        {selectedSanXuat.sanPham.tiTrong != null
                          ? selectedSanXuat.sanPham.tiTrong
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Nguyen Lieu List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-zinc-800">
                      Danh sách nguyên liệu tiêu hao
                    </h4>
                    {selectedSanXuat.sanPham.nguyenLieu.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">Không có nguyên liệu</p>
                    ) : (
                      <div className="overflow-x-auto rounded border border-zinc-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-zinc-100 text-zinc-600">
                            <tr>
                              <th className="p-2">Tên nguyên liệu</th>
                              <th className="p-2 text-right">Đơn giá</th>
                              <th className="p-2 text-right">Định lượng</th>
                              <th className="p-2 text-right">Tổng tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSanXuat.sanPham.nguyenLieu.map((nl) => (
                              <tr key={nl.id || nl.tenNguyenLieu} className="border-t border-zinc-100">
                                <td className="p-2 font-medium">{nl.tenNguyenLieu}</td>
                                <td className="p-2 text-right">{formatPrice(nl.donGia)} đ</td>
                                <td className="p-2 text-right font-medium">{formatPrice(nl.dinhLuong)}</td>
                                <td className="p-2 text-right font-semibold">{formatPrice(nl.tongTien)} đ</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-zinc-50 font-bold border-t border-zinc-200">
                              <td className="p-2">Tổng cộng</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right">
                                {formatPrice(
                                  selectedSanXuat.sanPham.nguyenLieu.reduce(
                                    (sum, nl) => sum + (nl.dinhLuong || 0),
                                    0,
                                  ),
                                )}
                              </td>
                              <td className="p-2 text-right text-emerald-700">
                                {formatPrice(
                                  selectedSanXuat.sanPham.nguyenLieu.reduce(
                                    (sum, nl) => sum + (nl.tongTien || 0),
                                    0,
                                  ),
                                )}{" "}
                                đ
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">Không có thông tin sản phẩm</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main SanXuat Table */}
      <table className="w-full min-w-220 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("id")}
                className="font-semibold hover:text-zinc-900"
              >
                Mã LSX{sortLabel("id")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("tenKhachHang")}
                className="font-semibold hover:text-zinc-900"
              >
                Tên khách hàng{sortLabel("tenKhachHang")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Tên công ty</th>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("mssp")}
                className="font-semibold hover:text-zinc-900"
              >
                MSSP{sortLabel("mssp")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Tên thương mại</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Tên phân bón</th>
            <th className="px-3 py-3 sm:px-6 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                Chưa có lệnh sản xuất nào
              </td>
            </tr>
          ) : (
            sortedItems.map((item) => (
              <tr key={item.id} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-3 py-2 font-bold text-zinc-900 sm:px-6">
                  {`LSX${formatSoPhieu(item.id)}`}
                </td>
                <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">
                  {item.tenKhachHang}
                </td>
                <td className="px-3 py-2 text-zinc-600 sm:px-6">
                  {item.tenCongTy || "—"}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900 sm:px-6">
                  {item.mssp || "—"}
                </td>
                <td className="px-3 py-2 text-zinc-700 sm:px-6">
                  {item.tenThuongMai || "—"}
                </td>
                <td className="px-3 py-2 text-zinc-700 sm:px-6">
                  {item.tenPhanBon || "—"}
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-1">
                    <ExcelButton onClick={() => handleExportExcel(item)} />
                    <InfoButton onClick={() => handleOpenDetails(item)} />
                  </div>
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
                  if (page > 1) onPageChange(page - 1)
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
                  if (page < pageCount) onPageChange(page + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  )
}
