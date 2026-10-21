"use client"

import { use, useMemo, useState } from "react"
import { exportXuatHangExcel } from "@/lib/actions/xuat-hang/data"
import { downloadFile, formatDateTime, formatPrice, formatSoPhieu } from "@/lib/utils"
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
import { toast } from "@/components/ui/toast"

export type XuatHangNguyenLieu = {
  id: string
  tenNguyenLieu: string
  donGia: number
  soLuong: number
  tongTien: number
}

export type XuatHangVatTu = {
  id: string
  maVatTu: string
  donGia: number
  soLuong: number
  tongTien: number
}

export type ExportedProduct = {
  mssp: string
  tenThuongMai?: string
  tenPhanBon?: string
  quyCach?: string
  quyCachThung?: number
  donGia?: number
  soLuongThung: number
  soHangLe: number
  tongTien?: number
  giaTien?: number
  nguyenLieu?: XuatHangNguyenLieu[]
  vatTu?: XuatHangVatTu[]
}

export type DeliveryItem = {
  soPhieu: number
  mskh: string
  tenKhachHang: string
  tenCongTy: string | null
  diaChiGiaoHang: string
  sdtChanh: string | null
  ngayXuatHang: string
  sanPham: ExportedProduct[]
}

export type SortKey = "mskh" | "ngayXuatHang"

export default function XuatHangTable({
  dataPromise,
  page,
  onPageChange,
}: {
  dataPromise: Promise<{ items: DeliveryItem[]; total: number }>
  page: number
  onPageChange: (newPage: number) => void
}) {
  const { items: deliveries, total } = use(dataPromise)

  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "ngayXuatHang",
    direction: "desc",
  })

  const pageCount = Math.max(1, Math.ceil(total / 10))

  const sortedDeliveries = useMemo(() => {
    return [...deliveries].sort((a, b) => {
      let comparison: number
      if (sort.key === "ngayXuatHang") {
        comparison = new Date(a.ngayXuatHang).getTime() - new Date(b.ngayXuatHang).getTime()
      } else {
        const left = String(a[sort.key] ?? "").toLocaleLowerCase()
        const right = String(b[sort.key] ?? "").toLocaleLowerCase()
        comparison = left.localeCompare(right, "vi")
      }
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [deliveries, sort])

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

  function handleOpenDetails(delivery: DeliveryItem) {
    setSelectedDelivery(delivery)
    setIsDetailsOpen(true)
  }

  async function exportExcelFile(soPhieu: number) {
    const result = await exportXuatHangExcel(soPhieu)
    if ("error" in result) {
      toast.error(result.error ?? "Không thể xuất file Excel")
      return
    }
    downloadFile(result.data, result.fileName)
  }

  const allNguyenLieu = useMemo(() => {
    if (!selectedDelivery) return []
    const map = new Map<string, { tenNguyenLieu: string; donGia: number; soLuong: number; tongTien: number }>()
    for (const sp of selectedDelivery.sanPham) {
      for (const nl of sp.nguyenLieu ?? []) {
        const existing = map.get(nl.tenNguyenLieu)
        if (existing) {
          existing.soLuong += nl.soLuong
          existing.tongTien += nl.tongTien
        } else {
          map.set(nl.tenNguyenLieu, {
            tenNguyenLieu: nl.tenNguyenLieu,
            donGia: nl.donGia,
            soLuong: nl.soLuong,
            tongTien: nl.tongTien,
          })
        }
      }
    }
    return Array.from(map.values())
  }, [selectedDelivery])

  const allVatTu = useMemo(() => {
    if (!selectedDelivery) return []
    const map = new Map<string, { maVatTu: string; donGia: number; soLuong: number; tongTien: number }>()
    for (const sp of selectedDelivery.sanPham) {
      for (const vt of sp.vatTu ?? []) {
        const existing = map.get(vt.maVatTu)
        if (existing) {
          existing.soLuong += vt.soLuong
          existing.tongTien += vt.tongTien
        } else {
          map.set(vt.maVatTu, {
            maVatTu: vt.maVatTu,
            donGia: vt.donGia,
            soLuong: vt.soLuong,
            tongTien: vt.tongTien,
          })
        }
      }
    }
    return Array.from(map.values())
  }, [selectedDelivery])

  return (
    <>
      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-200">
            <DialogTitle className="text-xl font-bold text-zinc-900">
              Phiếu xuất hàng #{selectedDelivery ? formatSoPhieu(selectedDelivery.soPhieu) : ""}
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6">
              <ExcelButton onClick={() => exportExcelFile(selectedDelivery?.soPhieu || 0)} />
            </div>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-6 text-sm py-2">
              {/* Delivery Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 border border-zinc-200">
                <div>
                  <p className="text-zinc-500 text-xs">Khách hàng</p>
                  <p className="font-semibold text-zinc-900">{selectedDelivery.mskh} - {selectedDelivery.tenKhachHang}</p>
                  {selectedDelivery.tenCongTy && <p className="text-xs text-zinc-600 mt-0.5">{selectedDelivery.tenCongTy}</p>}
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Ngày xuất hàng</p>
                  <p className="font-semibold text-zinc-900">{formatDateTime(new Date(selectedDelivery.ngayXuatHang))}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Địa chỉ giao hàng</p>
                  <p className="font-semibold text-zinc-900">{selectedDelivery.diaChiGiaoHang}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">SĐT chành</p>
                  <p className="font-semibold text-zinc-900">{selectedDelivery.sdtChanh || "—"}</p>
                </div>
              </div>

              {/* Products List (XuatHangSanPham) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base text-zinc-900">Danh sách sản phẩm</h3>
                {selectedDelivery.sanPham.map((sp) => (
                  <div key={sp.mssp} className="rounded-xl border border-zinc-200 p-4 space-y-4 bg-white shadow-xs">
                    <div className="border-b border-zinc-200 pb-3 space-y-2 text-sm">
                      {/* Row 1: mssp | tenThuongMai */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">{sp.mssp}</span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="font-semibold text-zinc-900">{sp.tenThuongMai || "—"}</span>
                        </div>
                      </div>

                      {/* Row 2: quyCach | quyCachThung */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 font-medium">Quy cách:</span>
                          <span className="text-zinc-800">{sp.quyCach || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-xs text-zinc-500 font-medium">Quy cách thùng:</span>
                          <span className="text-zinc-800">{sp.quyCachThung}</span>
                        </div>
                      </div>

                      {/* Row 3: soLuong (now showing correctly) */}
                      <div className="flex items-center justify-between gap-4 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100">
                        <span className="text-xs text-zinc-600 font-medium">Số lượng:</span>
                        <span className="font-semibold text-zinc-900">
                          {sp.soLuongThung * (sp.quyCachThung || 0) + (sp.soHangLe || 0)} sp ({sp.soLuongThung} thùng{sp.soHangLe > 0 ? `, ${sp.soHangLe} lẻ` : ""})
                        </span>
                      </div>

                      {/* Row 4: donGia | tongTien */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 font-medium">Đơn giá:</span>
                          <span className="text-zinc-800">{formatPrice(sp.donGia ?? 0)} đ</span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-xs text-zinc-500 font-medium">Tổng tiền:</span>
                          <span className="font-bold text-emerald-700">{formatPrice(sp.tongTien ?? 0)} đ</span>
                        </div>
                      </div>
                    </div>

                    {/* NguyenLieu used for this XuatHangSanPham */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Nguyên liệu tiêu hao:</p>
                      {(!sp.nguyenLieu || sp.nguyenLieu.length === 0) ? (
                        <p className="text-xs text-zinc-400 italic">Không có nguyên liệu</p>
                      ) : (
                        <table className="w-full text-xs text-left border border-zinc-200 rounded overflow-hidden">
                          <thead className="bg-zinc-100 text-zinc-600">
                            <tr>
                              <th className="p-2">Tên nguyên liệu</th>
                              <th className="p-2 text-right">Đơn giá</th>
                              <th className="p-2 text-right">Số lượng</th>
                              <th className="p-2 text-right">Tổng tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sp.nguyenLieu.map((nl) => (
                              <tr key={nl.id || nl.tenNguyenLieu} className="border-t border-zinc-100">
                                <td className="p-2 font-medium">{nl.tenNguyenLieu}</td>
                                <td className="p-2 text-right">{formatPrice(nl.donGia)} đ</td>
                                <td className="p-2 text-right font-medium">{formatPrice(nl.soLuong)}</td>
                                <td className="p-2 text-right font-semibold">{formatPrice(nl.tongTien)} đ</td>
                              </tr>
                            ))}
                          <tr className={`border-t border-zinc-100`}>
                            <td className="p-2 font-semibold">Tổng</td>
                            <td className="p-2 text-right"></td>
                            <td className="p-2 text-right font-medium">{formatPrice(sp.nguyenLieu.reduce((acc, nl) => acc + (nl.soLuong || 0), 0))}</td>
                            <td className="p-2 text-right font-semibold">{formatPrice(sp.nguyenLieu.reduce((acc, nl) => acc + (nl.tongTien || 0), 0))} đ</td>
                          </tr>
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* VatTu used for this XuatHangSanPham */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Vật tư tiêu hao:</p>
                      {(!sp.vatTu || sp.vatTu.length === 0) ? (
                        <p className="text-xs text-zinc-400 italic">Không có vật tư</p>
                      ) : (
                        <table className="w-full text-xs text-left border border-zinc-200 rounded overflow-hidden">
                          <thead className="bg-zinc-100 text-zinc-600">
                            <tr>
                              <th className="p-2">Mã vật tư</th>
                              <th className="p-2 text-right">Đơn giá</th>
                              <th className="p-2 text-right">Số lượng</th>
                              <th className="p-2 text-right">Tổng tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sp.vatTu.map((vt) => (
                              <tr key={vt.id || vt.maVatTu} className="border-t border-zinc-100">
                                <td className="p-2 font-medium">{vt.maVatTu}</td>
                                <td className="p-2 text-right">{formatPrice(vt.donGia)} đ</td>
                                <td className="p-2 text-right font-medium">{vt.soLuong}</td>
                                <td className="p-2 text-right font-semibold">{formatPrice(vt.tongTien)} đ</td>
                              </tr>
                            ))}
                            <tr className={`border-t border-zinc-100`}>
                              <td className="p-2 font-semibold">Tổng</td>
                              <td className="p-2 text-right"></td>
                              <td className="p-2 text-right font-medium">{sp.vatTu.reduce((acc, vt) => acc + (vt.soLuong || 0), 0)}</td>
                              <td className="p-2 text-right font-semibold">{formatPrice(sp.vatTu.reduce((acc, vt) => acc + (vt.tongTien || 0), 0))} đ</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 2 parts to show all XuatHangNguyenLieu and XuatHangVatTu used for this XuatHang */}
              <div className="border-t border-zinc-200 pt-5 space-y-5">
                <h3 className="font-semibold text-base text-zinc-900">Tổng hợp nguyên liệu & vật tư </h3>

                {/* Part 1: All XuatHangNguyenLieu */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-800 flex items-center justify-between">
                    <span>Tổng nguyên liệu tiêu hao</span>
                    <span className="text-xs font-normal text-zinc-500">
                      Tổng tiền: <strong className="text-zinc-900 font-semibold">{formatPrice(allNguyenLieu.reduce((sum, item) => sum + item.tongTien, 0))} đ</strong>
                    </span>
                  </h4>
                  {allNguyenLieu.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">Không có dữ liệu nguyên liệu</p>
                  ) : (
                    <table className="w-full text-xs text-left border border-zinc-200 rounded overflow-hidden">
                      <thead className="bg-zinc-100 text-zinc-600">
                        <tr>
                          <th className="p-2">Tên nguyên liệu</th>
                          <th className="p-2 text-right">Đơn giá</th>
                          <th className="p-2 text-right">Tổng số lượng</th>
                          <th className="p-2 text-right">Tổng thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allNguyenLieu.map((nl) => (
                          <tr key={nl.tenNguyenLieu} className="border-t border-zinc-100">
                            <td className="p-2 font-medium">{nl.tenNguyenLieu}</td>
                            <td className="p-2 text-right">{formatPrice(nl.donGia)} đ</td>
                            <td className="p-2 text-right font-medium">{formatPrice(nl.soLuong)}</td>
                            <td className="p-2 text-right font-semibold">{formatPrice(nl.tongTien)} đ</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-50 font-bold border-t border-zinc-200">
                          <td className="p-2">Tổng cộng</td>
                          <td className="p-2"></td>
                          <td className="p-2 text-right">{formatPrice(allNguyenLieu.reduce((sum, item) => sum + item.soLuong, 0))}</td>
                          <td className="p-2 text-right">{formatPrice(allNguyenLieu.reduce((sum, item) => sum + item.tongTien, 0))} đ</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* Part 2: All XuatHangVatTu */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-800 flex items-center justify-between">
                    <span>Tổng vật tư tiêu hao</span>
                    <span className="text-xs font-normal text-zinc-500">
                      Tổng tiền: <strong className="text-zinc-900 font-semibold">{formatPrice(allVatTu.reduce((sum, item) => sum + item.tongTien, 0))} đ</strong>
                    </span>
                  </h4>
                  {allVatTu.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">Không có dữ liệu vật tư</p>
                  ) : (
                    <table className="w-full text-xs text-left border border-zinc-200 rounded overflow-hidden">
                      <thead className="bg-zinc-100 text-zinc-600">
                        <tr>
                          <th className="p-2">Mã vật tư</th>
                          <th className="p-2 text-right">Đơn giá</th>
                          <th className="p-2 text-right">Tổng số lượng</th>
                          <th className="p-2 text-right">Tổng thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allVatTu.map((vt) => (
                          <tr key={vt.maVatTu} className="border-t border-zinc-100">
                            <td className="p-2 font-medium">{vt.maVatTu}</td>
                            <td className="p-2 text-right">{formatPrice(vt.donGia)} đ</td>
                            <td className="p-2 text-right font-medium">{vt.soLuong}</td>
                            <td className="p-2 text-right font-semibold">{formatPrice(vt.tongTien)} đ</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-50 font-bold border-t border-zinc-200">
                          <td className="p-2">Tổng cộng</td>
                          <td className="p-2"></td>
                          <td className="p-2 text-right">{allVatTu.reduce((sum, item) => sum + item.soLuong, 0)}</td>
                          <td className="p-2 text-right">{formatPrice(allVatTu.reduce((sum, item) => sum + item.tongTien, 0))} đ</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <table className="w-full min-w-275 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("mskh")}
                className="font-semibold hover:text-zinc-900"
              >
                Mã KH{sortLabel("mskh")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold">
              Tên khách hàng
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold">
              Tên công ty
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold">
              Địa chỉ giao hàng
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold">
              SĐT chành
            </th>
            <th className="px-3 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("ngayXuatHang")}
                className="font-semibold hover:text-zinc-900"
              >
                Ngày xuất hàng{sortLabel("ngayXuatHang")}
              </button>
            </th>
            <th className="px-3 py-3 sm:px-6 font-semibold">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedDeliveries.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                Không có phiếu xuất hàng nào
              </td>
            </tr>
          ) : (
            sortedDeliveries.map((item) => (
              <tr key={item.soPhieu} className="border-t border-zinc-100">
                <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">
                  {item.mskh}
                </td>
                <td className="px-3 py-2 sm:px-6">{item.tenKhachHang}</td>
                <td className="px-3 py-2 sm:px-6">{item.tenCongTy ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{item.diaChiGiaoHang}</td>
                <td className="px-3 py-2 sm:px-6">{item.sdtChanh ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  {formatDateTime(new Date(item.ngayXuatHang))}
                </td>
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <ExcelButton onClick={() => exportExcelFile(item.soPhieu)} />
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


