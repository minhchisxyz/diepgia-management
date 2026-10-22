"use client"

import { useState } from "react"
import { createProduct } from "@/lib/actions/san-pham/data"
import { formatPrice } from '@/lib/utils'
import { LoaiVatTu } from '@prisma/client'
import { getLoaiVatTuLabel } from '@/lib/loai-vat-tu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

export type Customer = { mskh: string; ten: string }
export type Ingredient = { id: string; ten: string; donVi: string; loai: string; donGia?: string | null }
export type VatTu = { ms: string; loai: LoaiVatTu; kho: number; donGia: string | null }
export type ProductIngredient = {
  nguyenLieu: Ingredient
  dinhLuong: string
  donGia?: string | null
}
export type Product = {
  mssp: string
  mskh: string
  tenThuongMai: string | null
  tenPhanBon: string | null
  quyCach: string
  quyCachThung: string
  donGia: string
  tiTrong: number | null
  khachHang: Customer
  nguyenLieu: ProductIngredient[]
  vatTu: VatTu[]
}

export type Row = { nguyenLieuId: string; dinhLuong: string; isNew?: boolean }
export type VatTuRow = { ms: string; isNew?: boolean }

export default function SanPhamForm({
  customers,
  ingredients,
  vatTus,
  onSuccess,
}: {
  customers: Customer[]
  ingredients: Ingredient[]
  vatTus: VatTu[]
  onSuccess?: () => void
}) {
  const [mssp, setMssp] = useState("")
  const [mskh, setMskh] = useState("")
  const [tenThuongMai, setTenThuongMai] = useState("")
  const [tenPhanBon, setTenPhanBon] = useState("")
  const [quyCach, setQuyCach] = useState("")
  const [quyCachThung, setQuyCachThung] = useState("")
  const [donGia, setDonGia] = useState("")
  const [tiTrong, setTiTrong] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [vatTuRows, setVatTuRows] = useState<VatTuRow[]>([])

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    )
  }

  function resetCreateForm() {
    setMssp("")
    setMskh("")
    setTenThuongMai("")
    setTenPhanBon("")
    setQuyCach("")
    setQuyCachThung("")
    setDonGia("")
    setTiTrong("")
    setRows([])
    setVatTuRows([])
  }

  async function handleCreateProduct(formData: FormData) {
    const hasIncompleteRow = rows.some(
      (row) => (!row.nguyenLieuId && row.dinhLuong) || (row.nguyenLieuId && !row.dinhLuong),
    )
    if (hasIncompleteRow) {
      toast.error("Vui lòng điền đầy đủ thông tin hoặc xóa dòng nguyên liệu chưa hoàn tất")
      return
    }

    const productIngredients = rows
      .filter((row) => row.nguyenLieuId && row.dinhLuong)
      .map((row) => ({ nguyenLieuId: row.nguyenLieuId, dinhLuong: Number(row.dinhLuong) }))

    if (productIngredients.some((row) => !Number.isFinite(row.dinhLuong) || row.dinhLuong <= 0)) {
      toast.error("Định lượng nguyên liệu phải lớn hơn 0")
      return
    }

    const ingredientIds = productIngredients.map((item) => item.nguyenLieuId)
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      toast.error("Không được chọn trùng nguyên liệu")
      return
    }

    const formMssp = (formData.get("mssp") as string)?.trim() || mssp.trim()
    const formMskh = (formData.get("mskh") as string)?.trim() || mskh.trim()
    const formTenThuongMai = (formData.get("tenThuongMai") as string)?.trim() ?? tenThuongMai.trim()
    const formTenPhanBon = (formData.get("tenPhanBon") as string)?.trim() ?? tenPhanBon.trim()
    const formQuyCach = (formData.get("quyCach") as string)?.trim() || quyCach.trim()
    const formQuyCachThung = (formData.get("quyCachThung") as string)?.trim() || quyCachThung.trim()
    const formDonGia = (formData.get("donGia") as string)?.trim() || donGia.trim()
    const formTiTrong = (formData.get("tiTrong") as string)?.trim() || tiTrong.trim()

    if (!formMssp) {
      toast.error("Vui lòng nhập mã sản phẩm")
      return
    }

    if (!formMskh) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }

    const data = {
      mssp: formMssp,
      mskh: formMskh,
      tenThuongMai: formTenThuongMai,
      tenPhanBon: formTenPhanBon,
      quyCach: formQuyCach,
      quyCachThung: Number(formQuyCachThung),
      donGia: Number(formDonGia),
      tiTrong: formTiTrong ? Number(formTiTrong) : null,
      nguyenLieu: productIngredients,
      vatTu: vatTuRows.map((row) => row.ms).filter(Boolean),
    }
    const result = (await createProduct(data)) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã tạo sản phẩm")
      resetCreateForm()
      onSuccess?.()
    }
  }

  return (
    <div>
      <form action={handleCreateProduct} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Mã sản phẩm (*)
          <input
            name="mssp"
            value={mssp}
            onChange={(event) => setMssp(event.target.value)}
            placeholder="Nhập mã sản phẩm"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Khách hàng (*)
          <Select
            name="mskh"
            value={mskh}
            onValueChange={(val) => setMskh(val ?? "")}
            required
          >
            <SelectTrigger className="w-full h-10 border-zinc-300 bg-white">
              <SelectValue placeholder="Chọn khách hàng" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.mskh} value={customer.mskh}>
                  {customer.mskh} - {customer.ten}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tên thương mại
          <input
            name="tenThuongMai"
            value={tenThuongMai}
            onChange={(event) => setTenThuongMai(event.target.value)}
            placeholder="Nhập tên thương mại (tùy chọn)"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tên phân bón
          <input
            name="tenPhanBon"
            value={tenPhanBon}
            onChange={(event) => setTenPhanBon(event.target.value)}
            placeholder="Nhập tên phân bón (tùy chọn)"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Quy cách (*)
          <input
            name="quyCach"
            value={quyCach}
            onChange={(event) => setQuyCach(event.target.value)}
            placeholder="Nhập quy cách (ví dụ: 100g, 500ml)"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Quy cách thùng (*)
          <input
            name="quyCachThung"
            type="number"
            min="1"
            value={quyCachThung}
            onChange={(event) => setQuyCachThung(event.target.value)}
            placeholder="Nhập quy cách thùng"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Đơn giá (*)
          <input
            name="donGia"
            type="number"
            min="0"
            step="1"
            value={donGia}
            onChange={(event) => setDonGia(event.target.value)}
            placeholder="Nhập đơn giá"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tỉ trọng (kg/lít)
          <input
            name="tiTrong"
            type="number"
            step="0.001"
            min="0"
            value={tiTrong}
            onChange={(event) => setTiTrong(event.target.value)}
            placeholder="Nhập tỉ trọng (tùy chọn)"
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <p className="text-sm font-medium text-zinc-700">Nguyên liệu:</p>
          {rows.map((row, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <Select
                value={row.nguyenLieuId}
                onValueChange={(val) => updateRow(index, "nguyenLieuId", val ?? "")}
              >
                <SelectTrigger className="w-full h-10 border-zinc-300 bg-white">
                  <SelectValue placeholder="Chọn nguyên liệu" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.ten} - {item.loai} ({item.donVi})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={row.dinhLuong}
                onChange={(event) => updateRow(index, "dinhLuong", event.target.value)}
                placeholder="Định lượng"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={() =>
                  setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
                }
                className="rounded-lg border px-3 py-2 hover:bg-zinc-100"
              >
                Xóa
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((current) => [...current, { nguyenLieuId: "", dinhLuong: "" }])}
            className="rounded-lg border px-4 py-2 hover:bg-zinc-100"
          >
            Thêm nguyên liệu
          </button>
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <p className="text-sm font-medium text-zinc-700">Vật tư:</p>
          {vatTuRows.map((row, index) => {
            const vatTuInfo = vatTus.find((v) => v.ms === row.ms)
            return (
              <div key={index} className="flex items-center gap-3">
                <Select
                  value={row.ms}
                  onValueChange={(val) =>
                    setVatTuRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ms: val ?? "" } : item,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="min-w-0 flex-1 h-10 border-zinc-300 bg-white">
                    <SelectValue placeholder="Chọn vật tư" />
                  </SelectTrigger>
                  <SelectContent>
                    {vatTus.map((vatTu) => (
                      <SelectItem key={vatTu.ms} value={vatTu.ms}>
                        {vatTu.ms} - {getLoaiVatTuLabel(vatTu.loai)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {vatTuInfo?.donGia != null && (
                  <span className="text-sm text-zinc-500 whitespace-nowrap">
                    Đơn giá: {formatPrice(vatTuInfo.donGia)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setVatTuRows((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  className="rounded-lg border px-3 py-2 hover:bg-zinc-100"
                >
                  Xóa
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => setVatTuRows((current) => [...current, { ms: "", isNew: true }])}
            className="rounded-lg border px-4 py-2 hover:bg-zinc-100"
          >
            Thêm vật tư
          </button>
        </div>
        <button className="rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer lg:col-span-4">
          Thêm sản phẩm
        </button>
      </form>
    </div>
  )
}
