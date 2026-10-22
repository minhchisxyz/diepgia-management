"use client"

import { useState } from "react"
import { createXuatHang, getNextSoPhieu } from "@/lib/actions/xuat-hang/data"
import { downloadFile, formatDateTime, formatPrice, formatSoPhieu } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { listProductsForCustomer } from "@/lib/actions/san-pham/data"
import { getDiaChiGiaoHangForCustomer } from "@/lib/actions/khach-hang/data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { Printer } from "lucide-react"

export type Customer = {
  mskh: string
  ten: string
  tenCongTy: string | null
  diaChi?: string
  tinh?: string
  maSoThue?: string | null
  soDienThoai?: string | null
}

export type Product = {
  mssp: string
  tenPhanBon: string
  tenThuongMai: string
  quyCach: string
  quyCachThung: number
  donGia: number
  khoiLuong: number
}

export type ProductRow = {
  mssp: string
  soLuongThung: string
  soHangLe: string
  khoiLuong: string
}

export type PrintRow = {
  mssp: string
  tenThuongMai: string
  quyCach: string
  quyCachThung: number
  soLuongThung: number
  soHangLe: number
}

export type PreviewData = {
  soPhieu: number
  ngayXuat: Date
  customer: Customer
  rows: PrintRow[]
  diaChiGiaoHang: string
  sdtChanh: string | null
}

export default function XuatHangForm({
  customers,
  initialProducts = [],
  onSuccess,
}: {
  customers: Customer[]
  initialProducts?: Product[]
  onSuccess?: () => void
}) {
  const [mskh, setMskh] = useState("")
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [rows, setRows] = useState<ProductRow[]>([{ mssp: "", soLuongThung: "", soHangLe: "", khoiLuong: "" }])
  const [diaChiOption, setDiaChiOption] = useState<"Nhận tại kho" | "Khác">("Nhận tại kho")
  const [diaChiKhac, setDiaChiKhac] = useState("")
  const [sdtChanh, setSdtChanh] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)

  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  async function handleOpenPreview() {
    const diaChiGiaoHang = diaChiOption === "Khác" ? diaChiKhac.trim() : "Nhận tại kho"
    const phoneChanh = diaChiOption === "Khác" ? sdtChanh.trim() : null

    if (diaChiOption === "Khác") {
      if (!diaChiGiaoHang) {
        toast.error("Vui lòng nhập địa chỉ giao hàng")
        return
      }
      if (!phoneChanh) {
        toast.error("Vui lòng nhập số điện thoại chành")
        return
      }
    }

    if (!mskh) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }

    const currentCustomer = customers.find((c) => c.mskh === mskh)
    if (!currentCustomer) {
      toast.error("Không tìm thấy thông tin khách hàng")
      return
    }

    const validRows = rows.filter((r) => r.mssp && Number(r.soLuongThung) > 0)
    if (validRows.length === 0) {
      toast.error("Cần ít nhất một sản phẩm với số lượng thùng lớn hơn 0")
      return
    }

    if (validRows.some((r) => !Number.isInteger(Number(r.soLuongThung)) || Number(r.soLuongThung) <= 0)) {
      toast.error("Số lượng thùng phải là số nguyên lớn hơn 0")
      return
    }

    if (validRows.some((r) => r.soHangLe && (!Number.isInteger(Number(r.soHangLe)) || Number(r.soHangLe) < 0))) {
      toast.error("Số hàng lẻ phải là số nguyên không âm")
      return
    }

    const productCodes = validRows.map((r) => r.mssp)
    if (new Set(productCodes).size !== productCodes.length) {
      toast.error("Không được chọn trùng sản phẩm")
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
          quyCach: prod?.quyCach ?? "",
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
      toast.error("Không thể chuẩn bị thông tin phiếu xuất hàng")
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
      if ("error" in result) {
        toast.error(result.error ?? "Không thể tạo phiếu xuất hàng")
        return
      }

      downloadFile(result.data, result.fileName)
      toast.success(`Đã tạo phiếu xuất hàng số ${result.soPhieu}`)
      setRows([{ mssp: "", soLuongThung: "", soHangLe: "", khoiLuong: "" }])
      setDiaChiOption("Nhận tại kho")
      setDiaChiKhac("")
      setSdtChanh("")
      setIsPreviewOpen(false)
      setPreviewData(null)

      onSuccess?.()
    } catch {
      toast.error("Không thể tạo phiếu xuất hàng")
    } finally {
      setIsSaving(false)
    }
  }

  async function selectCustomer(value: string) {
    setMskh(value)
    setRows([{ mssp: "", soLuongThung: "", soHangLe: "", khoiLuong: "" }])
    setProducts(value ? await listProductsForCustomer(value) : initialProducts)
    const result = await getDiaChiGiaoHangForCustomer(value)
    if (result?.diaChiGiaoHang && result?.sdtChanh) {
      setDiaChiOption("Khác")
      setDiaChiKhac(result.diaChiGiaoHang)
      setSdtChanh(result.sdtChanh)
    }
  }

  function getProductDetails(mssp: string) {
    const product = products.find((product) => product.mssp === mssp)
    return {
      tenThuongMai: product ? `${product.tenThuongMai}` : "",
      quyCach: product ? `${product.quyCach}` : "",
      quyCachThung: product ? `${product.quyCachThung}/thùng` : "",
      donGia: product ? `${formatPrice(product.donGia)}` : "",
      khoiLuong: product ? `${product.khoiLuong}` : "",
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
    <>
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

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
          Xuất hàng
        </h1>
        <form action={handleOpenPreview} className="mt-5 space-y-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Khách hàng (*)
            <Select
              name="mskh"
              value={mskh}
              onValueChange={(val) => void selectCustomer(val ?? "")}
              required
            >
              <SelectTrigger className="w-full h-10 border-zinc-300 bg-white">
                <SelectValue placeholder="Chọn khách hàng" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.mskh} value={customer.mskh}>
                    {customer.mskh}-{customer.ten}{customer.tenCongTy ? `-${customer.tenCongTy}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  checked={diaChiOption === "Nhận tại kho"}
                  onChange={() => setDiaChiOption("Nhận tại kho")}
                  className="accent-zinc-900"
                />
                <span>Nhận tại kho</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="diaChiGiaoHang"
                  value="Khác"
                  checked={diaChiOption === "Khác"}
                  onChange={() => setDiaChiOption("Khác")}
                  className="accent-zinc-900"
                />
                <span>Khác</span>
              </label>
            </div>
            {diaChiOption === "Khác" && (
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
                {/*<span className="flex-1 min-w-25">Khối lượng (kg)</span>*/}
                <span className="flex-1 min-w-30">Số lượng thùng (*)</span>
                <span className="flex-1 min-w-25">Hàng lẻ</span>
                <span className="flex-1 min-w-25">Đơn giá</span>
                <span className="flex-1 min-w-25">Tổng tiền</span>
                <span className="flex-none w-14 text-center"></span>
              </div>

              {rows.map((row, index) => (
                <div key={index} className="flex flex-row items-center w-full min-w-225 gap-2">
                  <Select
                    value={row.mssp}
                    onValueChange={(val) =>
                      setRows((current) =>
                        current.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, mssp: val ?? "" } : item,
                        ),
                      )
                    }
                    required
                  >
                    <SelectTrigger className="flex-2 min-w-37.5 h-10 truncate rounded-lg border-zinc-300 bg-white">
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.mssp} value={product.mssp}>
                          {product.mssp}-{product.tenThuongMai}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  {/*<input
                      type="number"
                      min="0"
                      value={row.khoiLuong}
                      onChange={(event) => {
                        const khoiLuong = parseFloat(event.target.value)
                        const khoiLuongSanPham = parseFloat(getProductDetails(row.mssp).khoiLuong)
                        const soLuongSanPham = Math.floor(khoiLuong / khoiLuongSanPham)
                        const soLuongThung = Math.floor(soLuongSanPham / (parseFloat(getProductDetails(row.mssp).quyCachThung) || 1))
                        const soHangLe = soLuongSanPham % (parseFloat(getProductDetails(row.mssp).quyCachThung) || 1)
                        setRows((current) =>
                            current.map((item, rowIndex) =>
                                rowIndex === index ? { ...item, khoiLuong: event.target.value, soLuongThung: soLuongThung.toString(), soHangLe: soHangLe.toString() } : item,
                            ),
                        )
                        }
                      }
                      placeholder="Khối lượng"
                      className="flex-1 min-w-30 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />*/}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.soLuongThung}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, rowIndex) => {
                            if (rowIndex !== index) return item
                            /*const soLuongThung = parseInt(event.target.value) || 0
                            const khoiLuongSanPham = parseFloat(getProductDetails(item.mssp).khoiLuong)
                            const quyCachThung = parseFloat(getProductDetails(item.mssp).quyCachThung) || 0
                            const soHangLe = parseInt(item.soHangLe) || 0
                            const khoiLuong = (soLuongThung * quyCachThung + soHangLe) * khoiLuongSanPham*/
                            return {...item, soLuongThung: event.target.value,
                              //khoiLuong: khoiLuong > 0 ? khoiLuong.toString() : ''
                            }
                          }
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
                            current.map((item, rowIndex) => {
                                  if (rowIndex !== index) return item
                                  /*const soHangLe = parseInt(event.target.value) || 0
                                  const khoiLuongSanPham = parseFloat(getProductDetails(item.mssp).khoiLuong)
                                  const quyCachThung = parseFloat(getProductDetails(item.mssp).quyCachThung) || 0
                                  const soLuongThung = parseInt(item.soLuongThung) || 0
                                  const khoiLuong = (soLuongThung * quyCachThung + soHangLe) * khoiLuongSanPham*/
                                  return {...item, soHangLe: event.target.value,
                                    //khoiLuong: khoiLuong > 0 ? khoiLuong.toString() : ''
                                  }
                                }
                            ),
                        )
                    }
                    placeholder="Số hàng lẻ"
                    className="flex-1 min-w-25 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={getProductDetails(row.mssp).donGia || ""}
                    placeholder="Đơn giá"
                    readOnly
                    className="flex-1 min-w-25 rounded-lg border bg-zinc-100 text-zinc-500 cursor-not-allowed focus:outline-none px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={getTotalPrice(row.mssp) || ""}
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
                    className="flex-none w-14 whitespace-nowrap rounded-lg border px-3 py-2 text-sm hover:bg-zinc-100 hover:cursor-pointer"
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
                  { mssp: "", soLuongThung: "", soHangLe: "", khoiLuong: "" },
                ])
              }
              className="rounded-lg border px-4 py-2 text-sm hover:cursor-pointer"
            >
              Thêm sản phẩm
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving || isPreparing}
            className={`rounded-lg ${isPreparing ? "bg-zinc-900" : "bg-green-900"} px-5 py-2 font-medium text-white hover:cursor-pointer disabled:opacity-50`}
          >
            {isPreparing ? "Đang chuẩn bị..." : <span className="flex flex-row items-center justify-center gap-2"><Printer /> In</span>}
          </button>
        </form>
      </section>
    </>
  )
}

