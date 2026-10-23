"use client"

import { useState, useTransition } from "react"
import {
  createSanXuat,
  listProductsWithRecipeForCustomer,
} from "@/lib/actions/san-xuat/data"
import {downloadFile, formatNumber, formatPrice} from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

export type Customer = {
  mskh: string
  ten: string
  tenCongTy: string | null
}

export type ProductNguyenLieu = {
  nguyenLieuId: string
  tenNguyenLieu: string
  donGia: number
  dinhLuong: number
}

export type ProductWithRecipe = {
  mssp: string
  tenPhanBon: string | null
  tenThuongMai: string | null
  donGia: number
  tiTrong: number | null
  khoiLuong: number
  nguyenLieu: ProductNguyenLieu[]
}

export default function SanXuatForm({
  customers,
  onSuccess,
}: {
  customers: Customer[]
  onSuccess?: () => void
}) {
  const [selectedMskh, setSelectedMskh] = useState("")
  const [selectedMssp, setSelectedMssp] = useState("")
  const [massOrVolume, setMassOrVolume] = useState("")
  const [products, setProducts] = useState<ProductWithRecipe[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  function handleCustomerChange(mskh: string) {
    setSelectedMskh(mskh)
    setSelectedMssp("")
    setMassOrVolume("")
    if (!mskh) {
      setProducts([])
      return
    }

    setIsLoadingProducts(true)
    startTransition(async () => {
      try {
        const prods = await listProductsWithRecipeForCustomer(mskh)
        setProducts(prods)
      } catch {
        toast.error("Không thể tải danh sách sản phẩm")
      } finally {
        setIsLoadingProducts(false)
      }
    })
  }

  const selectedProduct = products.find((p) => p.mssp === selectedMssp)
  const numInput = parseFloat(massOrVolume)
  const isValidInput = !isNaN(numInput) && numInput > 0
  const hasTiTrong = !!(selectedProduct?.tiTrong && selectedProduct.tiTrong > 0)
  const totalMass = isValidInput
    ? hasTiTrong
      ? numInput * selectedProduct!.tiTrong!
      : numInput
    : 0

  const totalMassCongThuc = selectedProduct
    ? selectedProduct.nguyenLieu.reduce((sum, item) => sum + item.dinhLuong, 0)
    : 0

  const calculatedNguyenLieu = (selectedProduct?.nguyenLieu ?? []).map((item) => {
    const consumed =
      totalMassCongThuc > 0 && totalMass > 0
        ? (totalMass / totalMassCongThuc) * item.dinhLuong
        : 0
    const dinhLuong = Number(consumed.toFixed(3))
    const tongTien = Math.round(dinhLuong * item.donGia)
    return {
      tenNguyenLieu: item.tenNguyenLieu,
      donGia: item.donGia,
      dinhLuong,
      tongTien,
    }
  })

  const totalDinhLuong = calculatedNguyenLieu.reduce(
    (sum, item) => sum + item.dinhLuong,
    0,
  )
  const grandTotalTien = calculatedNguyenLieu.reduce(
    (sum, item) => sum + item.tongTien,
    0,
  )

  async function handleCreateSanXuat(formData: FormData) {
    const customerCode = (formData.get("mskh") as string)?.trim() || selectedMskh
    const productCode = (formData.get("mssp") as string)?.trim() || selectedMssp
    const massOrVolumeVal = (formData.get("massOrVolume") as string) || massOrVolume
    const numInput = parseFloat(massOrVolumeVal)
    if (!customerCode) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }
    if (!productCode) {
      toast.error("Vui lòng chọn sản phẩm")
      return
    }
    if (isNaN(numInput) || numInput <= 0) {
      toast.error("Vui lòng nhập khối lượng / thể tích hợp lệ lớn hơn 0")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createSanXuat({
        mskh: customerCode,
        mssp: productCode,
        massOrVolume: numInput,
      })

      if ("error" in res && res.error) {
        toast.error(res.error ?? "Không thể tạo lệnh sản xuất")
      } else {
        toast.success("Tạo lệnh sản xuất thành công")
        if (res.data && res.fileName) {
          downloadFile(res.data, res.fileName)
        }
        setSelectedMskh("")
        setSelectedMssp("")
        setMassOrVolume("")
        setProducts([])
        onSuccess?.()
      }
    } catch {
      toast.error("Có lỗi xảy ra khi tạo lệnh sản xuất")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-zinc-900">
        Tạo lệnh sản xuất mới
      </h2>

      <form action={handleCreateSanXuat} className="mt-5 space-y-6">
        <input type="hidden" name="mskh" value={selectedMskh} />
        <input type="hidden" name="mssp" value={selectedMssp} />
        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
          {/* 1. Chọn khách hàng */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Khách hàng (*)
            </label>
            <Select
              value={selectedMskh}
              onValueChange={(val) => handleCustomerChange(val ?? "")}
            >
              <SelectTrigger className="w-full h-10 border-zinc-300 bg-white">
                <SelectValue placeholder="Chọn khách hàng" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.mskh} value={c.mskh}>
                    {c.mskh} - {c.ten}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Chọn sản phẩm */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Sản phẩm (*)
            </label>
            <Select
              value={selectedMssp}
              onValueChange={(val) => setSelectedMssp(val ?? "")}
              disabled={!selectedMskh || isLoadingProducts}
            >
              <SelectTrigger className="w-full h-10 border-zinc-300 bg-white">
                <SelectValue
                  placeholder={
                    isLoadingProducts
                      ? "Đang tải sản phẩm..."
                      : selectedMskh
                        ? "Chọn sản phẩm"
                        : "Chọn khách hàng trước"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.mssp} value={p.mssp}>
                    {p.mssp}
                    {p.tenThuongMai ? ` - ${p.tenThuongMai}` : ""}
                    {p.tenPhanBon ? ` (${p.tenPhanBon})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Input khối lượng / thể tích */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              {hasTiTrong
                ? `Thể tích (lít) (*)`
                : `Khối lượng (kg) (*)`}
            </label>
            <input
              name="massOrVolume"
              type="number"
              step="0.001"
              min="0.001"
              value={massOrVolume}
              onChange={(e) => setMassOrVolume(e.target.value)}
              placeholder={
                hasTiTrong
                  ? "Nhập thể tích (lít)"
                  : "Nhập khối lượng (kg)"
              }
              disabled={!selectedMssp}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-400"
            />
            {selectedProduct && (
              <p className="text-xs text-zinc-500">
                {hasTiTrong ? (
                  <>
                    Tỉ trọng: <span className="font-semibold">{selectedProduct.tiTrong}</span> kg/lít &rarr; Tổng khối lượng:{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatNumber(totalMass)} kg
                    </span>
                  </>
                ) : (
                  <>
                    Tổng khối lượng:{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatNumber(totalMass)} kg
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Read-only List of NguyenLieu with donGia, dinhLuong, tongTien */}
        {selectedProduct && (
          <div className="space-y-2 border-t border-zinc-200 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                Nguyên liệu tiêu hao tính toán cho {selectedProduct.mssp}
                {selectedProduct.tenThuongMai ? ` - ${selectedProduct.tenThuongMai}` : ""}
              </h3>
              <span className="text-xs text-zinc-500">
                Tổng tiền:{" "}
                <strong className="text-emerald-700 font-bold">
                  {formatPrice(grandTotalTien)} đ
                </strong>
              </span>
            </div>

            {calculatedNguyenLieu.length === 0 ? (
              <p className="text-sm text-zinc-400 italic py-2">
                Sản phẩm này chưa có công thức nguyên liệu
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-100 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Tên nguyên liệu</th>
                      <th className="px-4 py-2.5 text-right">Đơn giá</th>
                      <th className="px-4 py-2.5 text-right">Định lượng (kg)</th>
                      <th className="px-4 py-2.5 text-right">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {calculatedNguyenLieu.map((nl) => (
                      <tr key={nl.tenNguyenLieu} className="hover:bg-zinc-50">
                        <td className="px-4 py-2 font-medium text-zinc-900">
                          {nl.tenNguyenLieu}
                        </td>
                        <td className="px-4 py-2 text-right text-zinc-600">
                          {formatPrice(nl.donGia)} đ
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-zinc-900">
                          {formatNumber(nl.dinhLuong)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                          {formatPrice(nl.tongTien)} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-50 font-bold border-t border-zinc-200 text-zinc-900">
                    <tr>
                      <td className="px-4 py-2.5">Tổng cộng</td>
                      <td className="px-4 py-2.5"></td>
                      <td className="px-4 py-2.5 text-right">
                        {formatNumber(totalDinhLuong)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-700">
                        {formatPrice(grandTotalTien)} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedMskh || !selectedMssp || !isValidInput || isSubmitting}
            className="rounded-lg bg-green-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Đang tạo lệnh..." : "Tạo lệnh sản xuất"}
          </button>
        </div>
      </form>
    </section>
  )
}
