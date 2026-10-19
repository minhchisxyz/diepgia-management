"use client"

import { FormEvent, useMemo, useRef, useState } from "react"
import { createXuatHang, getNextSoPhieu, listXuatHang } from "@/app/actions/xuat-hang/data"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { listProductsForCustomer } from "@/app/actions/san-pham/data"
import { getDiaChiGiaoHangForCustomer } from "@/app/actions/khach-hang/data"
import {Printer} from "lucide-react";

type Customer = {
  mskh: string
  ten: string
  tenCongTy: string | null
  diaChi?: string
  tinh?: string
  maSoThue?: string | null
  soDienThoai?: string | null
}

type Product = {
  mssp: string
  tenPhanBon: string
  tenThuongMai: string
  quyCach: string
  quyCachThung: number
  donGia: number
}

type ProductRow = {
  mssp: string
  soLuongThung: string
  soHangLe: string
}

type ExportedProduct = {
  mssp: string
  soLuongThung: number
  soHangLe: number
  giaTien?: number
}

type DeliveryItem = {
  soPhieu: number
  mskh: string
  tenKhachHang: string
  tenCongTy: string | null
  diaChiGiaoHang: string
  sdtChanh: string | null
  ngayXuatHang: string
  sanPham: ExportedProduct[]
}

type PrintRow = {
  mssp: string
  tenThuongMai: string
  quyCach: string
  quyCachThung: number
  soLuongThung: number
  soHangLe: number
}

type PreviewData = {
  soPhieu: number
  ngayXuat: Date
  customer: Customer
  rows: PrintRow[]
  diaChiGiaoHang: string
  sdtChanh: string | null
}

type SortKey = `mskh` | `ngayXuatHang`

export default function XuatHangManager({
  customers,
  initialProducts,
  initialDeliveries = [],
  initialTotal = 0,
}: {
  customers: Customer[]
  initialProducts: Product[]
  initialDeliveries?: DeliveryItem[]
  initialTotal?: number
}) {
  const [mskh, setMskh] = useState(``)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [rows, setRows] = useState<ProductRow[]>([{ mssp: ``, soLuongThung: ``, soHangLe: `` }])
  const [diaChiOption, setDiaChiOption] = useState<`Nhận tại kho` | `Khác`>(`Nhận tại kho`)
  const [diaChiKhac, setDiaChiKhac] = useState(``)
  const [sdtChanh, setSdtChanh] = useState(``)
  const [message, setMessage] = useState(``)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)

  // Preview dialog states
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(initialDeliveries)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: `` })
  const [sort, setSort] = useState<{ key: SortKey; direction: `asc` | `desc` }>({
    key: `ngayXuatHang`,
    direction: `desc`,
  })
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pageCount = Math.max(1, Math.ceil(total / 10))

  const sortedDeliveries = useMemo(() => {
    return [...deliveries].sort((a, b) => {
      let comparison: number
      if (sort.key === `ngayXuatHang`) {
        comparison = new Date(a.ngayXuatHang).getTime() - new Date(b.ngayXuatHang).getTime()
      } else {
        const left = String(a[sort.key] ?? ``).toLocaleLowerCase()
        const right = String(b[sort.key] ?? ``).toLocaleLowerCase()
        comparison = left.localeCompare(right, `vi`)
      }
      return sort.direction === `asc` ? comparison : -comparison
    })
  }, [deliveries, sort])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === `asc` ? `desc` : `asc` }
        : { key, direction: `asc` },
    )
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === `asc` ? ` ↑` : ` ↓`) : ` ↕`
  }

  async function handleOpenPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(``)

    const diaChiGiaoHang = diaChiOption === `Khác` ? diaChiKhac.trim() : `Nhận tại kho`
    const phoneChanh = diaChiOption === `Khác` ? sdtChanh.trim() : null

    if (diaChiOption === `Khác`) {
      if (!diaChiGiaoHang) {
        setMessage(`Vui lòng nhập địa chỉ giao hàng`)
        return
      }
      if (!phoneChanh) {
        setMessage(`Vui lòng nhập số điện thoại chành`)
        return
      }
    }

    if (!mskh) {
      setMessage(`Vui lòng chọn khách hàng`)
      return
    }

    const currentCustomer = customers.find((c) => c.mskh === mskh)
    if (!currentCustomer) {
      setMessage(`Không tìm thấy thông tin khách hàng`)
      return
    }

    const validRows = rows.filter((r) => r.mssp && Number(r.soLuongThung) > 0)
    if (validRows.length === 0) {
      setMessage(`Cần ít nhất một sản phẩm với số lượng thùng lớn hơn 0`)
      return
    }

    if (validRows.some((r) => !Number.isInteger(Number(r.soLuongThung)) || Number(r.soLuongThung) <= 0)) {
      setMessage(`Số lượng thùng phải là số nguyên lớn hơn 0`)
      return
    }

    if (validRows.some((r) => r.soHangLe && (!Number.isInteger(Number(r.soHangLe)) || Number(r.soHangLe) < 0))) {
      setMessage(`Số hàng lẻ phải là số nguyên không âm`)
      return
    }

    const productCodes = validRows.map((r) => r.mssp)
    if (new Set(productCodes).size !== productCodes.length) {
      setMessage(`Không được chọn trùng sản phẩm`)
      return
    }

    setIsPreparing(true)

    try {
      const nextSoPhieu = await getNextSoPhieu()
      const printRows: PrintRow[] = validRows.map((row) => {
        const prod = products.find((p) => p.mssp === row.mssp)
        return {
          mssp: row.mssp,
          tenThuongMai: prod?.tenThuongMai ?? row.mssp,
          quyCach: prod?.quyCach ?? ``,
          quyCachThung: prod?.quyCachThung ?? 0,
          soLuongThung: Number(row.soLuongThung),
          soHangLe: Number(row.soHangLe) || 0,
        }
      })

      const preparedData: PreviewData = {
        soPhieu: nextSoPhieu,
        ngayXuat: new Date(),
        customer: currentCustomer,
        rows: printRows,
        diaChiGiaoHang,
        sdtChanh: phoneChanh,
      }

      setPreviewData(preparedData)
      setIsPreviewOpen(true)
    } catch {
      setMessage(`Không thể chuẩn bị thông tin phiếu xuất hàng`)
    } finally {
      setIsPreparing(false)
    }
  }

  async function handleConfirmExport() {
    if (!previewData) return
    setIsSaving(true)

    try {
      const result = await createXuatHang(
        mskh,
        rows
          .filter((row) => row.mssp && Number(row.soLuongThung) > 0)
          .map((row) => ({
            mssp: row.mssp,
            soLuongThung: Number(row.soLuongThung),
            soHangLe: Number(row.soHangLe) || 0,
          })),
        previewData.diaChiGiaoHang,
        previewData.sdtChanh,
      )
      if (`error` in result) {
        setMessage(result.error ?? `Không thể tạo phiếu xuất hàng`)
        return
      }

      downloadFile(result.data, result.fileName)
      setMessage(`Đã tạo phiếu xuất hàng số ${result.soPhieu}`)
      setRows([{ mssp: ``, soLuongThung: ``, soHangLe: `` }])
      setDiaChiOption(`Nhận tại kho`)
      setDiaChiKhac(``)
      setSdtChanh(``)
      setIsPreviewOpen(false)
      setPreviewData(null)

      void listXuatHang(filters.search, page, 10).then((res) => {
        setDeliveries(res.items)
        setTotal(res.total)
      })
    } catch {
      setMessage(`Không thể tạo phiếu xuất hàng`)
    } finally {
      setIsSaving(false)
    }
  }

  async function selectCustomer(value: string) {
    setMskh(value)
    setRows([{ mssp: ``, soLuongThung: ``, soHangLe: `` }])
    setProducts(value ? await listProductsForCustomer(value) : initialProducts)
    const result = await getDiaChiGiaoHangForCustomer(value)
    if (result?.diaChiGiaoHang && result?.sdtChanh) {
      setDiaChiOption(`Khác`)
      setDiaChiKhac(result.diaChiGiaoHang)
      setSdtChanh(result.sdtChanh)
    }
  }

  function getProductDetails(mssp: string) {
    const product = products.find((product) => product.mssp === mssp)
    return {
      tenThuongMai: product ? `${product.tenThuongMai}` : ``,
      quyCach: product ? `${product.quyCach}` : ``,
      quyCachThung: product ? `${product.quyCachThung}/thùng` : ``,
      donGia: product ? `${formatPrice(product.donGia)}` : ``,
    }
  }

  function getTotalPrice(mssp: string) {
    const product = products.find((product) => product.mssp === mssp)
    if (!product) return 0
    const row = rows.find((row) => row.mssp === mssp)
    if (!row) return 0
    const soLuongThung = Number(row.soLuongThung) || 0
    const soHangLe = Number(row.soHangLe) || 0
    return formatPrice(product.donGia * (soLuongThung * product.quyCachThung + soHangLe))
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      {/* Shadcn UI Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-900">
              Xem trước phiếu xuất hàng
            </DialogTitle>
          </DialogHeader>

          {/* Corrected XLSX Format Document View */}
          <div
            className="flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-xs text-xs leading-relaxed"
            style={{ fontFamily: "'Times New Roman', Times, 'Segoe UI', Arial, sans-serif" }}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-black pb-2 mb-3">
              <div>
                <h2 className="font-bold text-sm uppercase">CÔNG TY TNHH SX TM DIỆP GIA</h2>
                <p className="text-[11px] text-zinc-700">Lô 7 cụm công nghiệp Nhị Xuân, ấp 25, xã Xuân Thới Sơn, Tp.HCM</p>
              </div>
              <div className="text-right text-[11px]">
                <p><span className="font-semibold">Số phiếu:</span> {previewData ? formatSoPhieu(previewData.soPhieu) : ""}</p>
                <p><span className="font-semibold">Ngày xuất:</span> {previewData ? formatDateTime(previewData.ngayXuat) : ""}</p>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-center font-bold text-base uppercase my-3 tracking-wide">PHIẾU XUẤT HÀNG</h1>

            {/* Customer Info */}
            <div className="grid grid-cols-3 gap-y-1.5 text-xs mb-4">
              <div className="col-span-2">
                <span className="font-semibold">Khách hàng: </span>{previewData?.customer.ten ?? ""}
              </div>
              <div>
                <span className="font-semibold">Số ĐT: </span>{previewData?.customer.soDienThoai ?? ""}
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Tên công ty: </span>{previewData?.customer.tenCongTy ?? ""}
              </div>
              <div>
                <span className="font-semibold">Tỉnh/Tp: </span>{previewData?.customer.tinh ?? ""}
              </div>
              <div className="col-span-3">
                <span className="font-semibold">MST: </span>{previewData?.customer.maSoThue ?? ""}
              </div>
              <div className="col-span-3">
                <span className="font-semibold">Địa chỉ: </span>{previewData?.customer.diaChi ?? ""}
              </div>
            </div>

            {/* Product Table */}
            <table className="w-full border-collapse border border-black text-center text-xs mb-3">
              <thead>
                <tr className="border border-black bg-zinc-50 font-semibold">
                  <th className="border border-black p-1.5 w-10">STT</th>
                  <th className="border border-black p-1.5 w-24">MSPB</th>
                  <th className="border border-black p-1.5">Tên thương mại</th>
                  <th className="border border-black p-1.5 w-20">Quy cách</th>
                  <th className="border border-black p-1.5 w-24">Quy cách đóng thùng</th>
                  <th className="border border-black p-1.5 w-20">Số lượng thùng</th>
                  <th className="border border-black p-1.5 w-20">Hàng lẻ</th>
                  <th className="border border-black p-1.5 w-24">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {previewData?.rows.map((row, idx) => (
                  <tr key={idx} className="border border-black">
                    <td className="border border-black p-1.5">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-medium">{row.mssp}</td>
                    <td className="border border-black p-1.5 text-left px-2">{row.tenThuongMai}</td>
                    <td className="border border-black p-1.5">{row.quyCach}</td>
                    <td className="border border-black p-1.5">{row.quyCachThung}</td>
                    <td className="border border-black p-1.5 font-semibold">{row.soLuongThung}</td>
                    <td className="border border-black p-1.5">{row.soHangLe || 0}</td>
                    <td className="border border-black p-1.5"></td>
                  </tr>
                ))}
                <tr className="border border-black font-semibold bg-zinc-50">
                  <td colSpan={5} className="border border-black p-1.5 text-right pr-4 uppercase">TỔNG</td>
                  <td className="border border-black p-1.5">
                    {previewData?.rows.reduce((sum, r) => sum + Number(r.soLuongThung), 0)}
                  </td>
                  <td className="border border-black p-1.5">
                    {previewData?.rows.reduce((sum, r) => sum + (Number(r.soHangLe) || 0), 0)}
                  </td>
                  <td className="border border-black p-1.5"></td>
                </tr>
              </tbody>
            </table>

            {/* Delivery Details */}
            <div className="flex justify-between items-center text-xs mb-6">
              <div>
                <span className="font-semibold">Địa chỉ giao hàng: </span>{previewData?.diaChiGiaoHang}
              </div>
              <div>
                <span className="font-semibold">SĐT chành: </span>{previewData?.sdtChanh ?? ""}
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-4 gap-4 text-center text-xs mt-6 pt-4">
              <div>
                <p className="font-semibold">Người lập phiếu</p>
                <p className="text-[10px] text-zinc-500 italic mt-0.5">(Ký, họ tên)</p>
                <div className="h-16"></div>
              </div>
              <div>
                <p className="font-semibold">Người lên hàng</p>
                <p className="text-[10px] text-zinc-500 italic mt-0.5">(Ký, họ tên)</p>
                <div className="h-16"></div>
              </div>
              <div>
                <p className="font-semibold">Thủ kho</p>
                <p className="text-[10px] text-zinc-500 italic mt-0.5">(Ký, họ tên)</p>
                <div className="h-16"></div>
              </div>
              <div>
                <p className="font-semibold">Người nhận hàng</p>
                <p className="text-[10px] text-zinc-500 italic mt-0.5">(Ký, họ tên)</p>
                <div className="h-16"></div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => void handleConfirmExport()}
            >
              {isSaving ? "Đang xử lý..." : "Xác nhận & Tải Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            Xuất hàng
          </h1>
          <form onSubmit={handleOpenPreview} className="mt-5 space-y-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Khách hàng (*)
              <select
                value={mskh}
                onChange={(event) => void selectCustomer(event.target.value)}
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
              >
                <option value="">Chọn khách hàng</option>
                {customers.map((customer) => (
                  <option key={customer.mskh} value={customer.mskh}>
                    {customer.mskh}-{customer.ten}{customer.tenCongTy ? `-${customer.tenCongTy}` : ``}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700">
                Địa chỉ giao hàng (*)
              </p>
              <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-800">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="diaChiGiaoHang"
                    value="Nhận tại kho"
                    checked={diaChiOption === `Nhận tại kho`}
                    onChange={() => setDiaChiOption(`Nhận tại kho`)}
                    className="accent-zinc-900"
                  />
                  <span>Nhận tại kho</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="diaChiGiaoHang"
                    value="Khác"
                    checked={diaChiOption === `Khác`}
                    onChange={() => setDiaChiOption(`Khác`)}
                    className="accent-zinc-900"
                  />
                  <span>Khác</span>
                </label>
              </div>
              {diaChiOption === `Khác` && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                    Địa chỉ giao hàng (*)
                    <input
                      type="text"
                      value={diaChiKhac}
                      onChange={(event) => setDiaChiKhac(event.target.value)}
                      placeholder="Nhập địa chỉ giao hàng"
                      required
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                    Số điện thoại chành (*)
                    <input
                      type="text"
                      value={sdtChanh}
                      onChange={(event) => setSdtChanh(event.target.value)}
                      placeholder="Nhập số điện thoại chành"
                      required
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:outline-none"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-700">Sản phẩm (*):</p>
              
              <div className="overflow-x-auto space-y-2 pb-1">
                {/* Headers for Adding SanPham */}
                <div className="flex flex-row items-center w-full min-w-225 gap-2 text-xs font-semibold text-zinc-600 px-1">
                  <span className="flex-2 min-w-37.5">Sản phẩm (*)</span>
                  <span className="flex-1 min-w-25">Quy cách</span>
                  <span className="flex-1 min-w-25">Quy cách thùng</span>
                  <span className="flex-1 min-w-30">Số lượng thùng (*)</span>
                  <span className="flex-1 min-w-25">Hàng lẻ</span>
                  <span className="flex-1 min-w-25">Đơn giá</span>
                  <span className="flex-1 min-w-25">Tổng tiền</span>
                  <span className="flex-none w-14 text-center">Xóa</span>
                </div>

                {rows.map((row, index) => (
                  <div key={index} className="flex flex-row items-center w-full min-w-225 gap-2">
                    <select
                      value={row.mssp}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, mssp: event.target.value } : item,
                          ),
                        )
                      }
                      required
                      title={getProductDetails(row.mssp).tenThuongMai}
                      className="flex-2 min-w-37.5 truncate rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      <option value="">Chọn sản phẩm</option>
                      {products.map((product) => (
                        <option key={product.mssp} value={product.mssp}>
                          {product.mssp}-{product.tenThuongMai}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={getProductDetails(row.mssp).quyCach}
                      placeholder="Quy cách"
                      readOnly
                      className="flex-1 min-w-25 rounded-lg border bg-zinc-100 text-zinc-500 cursor-not-allowed focus:outline-none px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={getProductDetails(row.mssp).quyCachThung}
                      placeholder="Quy cách thùng"
                      readOnly
                      className="flex-1 min-w-25 rounded-lg border bg-zinc-100 text-zinc-500 cursor-not-allowed focus:outline-none px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={row.soLuongThung}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, soLuongThung: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Số lượng thùng"
                      required
                      className="flex-1 min-w-30 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.soHangLe}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, soHangLe: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Số hàng lẻ"
                      className="flex-1 min-w-25 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={getProductDetails(row.mssp).donGia || ``}
                      placeholder="Đơn giá"
                      readOnly
                      className="flex-1 min-w-25 rounded-lg border bg-zinc-100 text-zinc-500 cursor-not-allowed focus:outline-none px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={getTotalPrice(row.mssp) || ``}
                      placeholder="Tổng tiền"
                      readOnly
                      className="flex-1 min-w-25 rounded-lg border bg-zinc-100 text-zinc-500 cursor-not-allowed focus:outline-none px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRows((current) =>
                          current.length === 1
                            ? current
                            : current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                      className="flex-none w-14 whitespace-nowrap rounded-lg border px-3 py-2 text-sm hover:bg-zinc-100"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setRows((current) => [
                    ...current,
                    { mssp: ``, soLuongThung: ``, soHangLe: `` },
                  ])
                }
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Thêm sản phẩm
              </button>
            </div>

            <button
              type="submit"
              disabled={isSaving || isPreparing}
              className={`rounded-lg ${isPreparing ? 'bg-zinc-900' : 'bg-green-900' } px-5 py-2 font-medium text-white disabled:opacity-50`}
            >
              {isPreparing ? `Đang chuẩn bị...` : <span className={`flex flex-row items-center justify-center gap-2`}><Printer/> In</span>}
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-zinc-600">{message}</p>}
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">
              Danh sách xuất hàng
            </h2>
            <input
              value={filters.search}
              onChange={(event) => {
                const search = event.target.value
                setFilters({ search })
                if (searchTimer.current) clearTimeout(searchTimer.current)
                searchTimer.current = setTimeout(() => {
                  setPage(1)
                  void listXuatHang(search, 1, 10).then((result) => {
                    setDeliveries(result.items)
                    setTotal(result.total)
                  })
                }, 500)
              }}
              placeholder="Lọc theo mã khách hàng"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"
            />
          </div>

          <table className="w-full min-w-275 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`mskh`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    Mã KH{sortLabel(`mskh`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6 font-semibold">
                  Tên khách hàng
                </th>
                <th className="px-3 py-2 sm:px-6 font-semibold">
                  Tên công ty
                </th>
                <th className="px-3 py-3 sm:px-6 font-semibold">
                  Sản phẩm
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
                    onClick={() => toggleSort(`ngayXuatHang`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    Ngày xuất hàng{sortLabel(`ngayXuatHang`)}
                  </button>
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
                    <td className="px-3 py-2 sm:px-6">{item.tenCongTy ?? `—`}</td>
                    <td className="px-3 py-2 sm:px-6">
                      <div className="flex flex-col gap-1 py-1">
                        {item.sanPham.map((sp) => (
                          <div key={sp.mssp} className="whitespace-nowrap">
                            {sp.mssp}: {sp.soLuongThung} Thùng, {sp.soHangLe} lẻ
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-6">{item.diaChiGiaoHang}</td>
                    <td className="px-3 py-2 sm:px-6">{item.sdtChanh ?? `—`}</td>
                    <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                      {formatDateTime(new Date(item.ngayXuatHang))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Pagination className="p-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="Trước"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    const next = Math.max(1, page - 1)
                    setPage(next)
                    void listXuatHang(filters.search, next, 10).then((r) => {
                      setDeliveries(r.items)
                      setTotal(r.total)
                    })
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
                    const next = Math.min(pageCount, page + 1)
                    setPage(next)
                    void listXuatHang(filters.search, next, 10).then((r) => {
                      setDeliveries(r.items)
                      setTotal(r.total)
                    })
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </div>
    </main>
  )
}
