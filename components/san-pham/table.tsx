"use client"

import { Fragment, use, useEffect, useMemo, useState } from "react"
import {
  createProduct,
  updateProduct,
  updateProductRecipe,
  updateProductVatTu,
  deleteProduct as deleteProductAction,
  exportProductExcelFile as exportProductExcelFileAction,
} from "@/lib/actions/san-pham/data"
import { calculateKhoiLuong, downloadFile, formatPrice } from '@/lib/utils'
import { getLoaiVatTuLabel } from '@/lib/loai-vat-tu'
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import {
  CancelButton, CloseButton,
  DeleteButton,
  EditButton,
  ExcelButton,
  ForwardButton,
  SaveButton, ViewButton,
} from "@/components/buttons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { Customer, Ingredient, VatTu, Product, Row, VatTuRow } from "./form"

type SortKey = "mssp" | "mskh"

type ProductDraft = {
  mssp: string
  mskh: string
  tenThuongMai: string
  tenPhanBon: string
  quyCach: string
  quyCachThung: string
  donGia: string
  tiTrong: string
}

const columns: {
  key: keyof Pick<Product, "mssp" | "tenThuongMai" | "tenPhanBon" | "quyCach" | "quyCachThung" | "donGia" | "mskh" | "tiTrong">
  label: string
}[] = [
  { key: "mssp", label: "Mã sản phẩm" },
  { key: "mskh", label: "Mã khách hàng" },
  { key: "tenThuongMai", label: "Tên thương mại" },
  { key: "tenPhanBon", label: "Tên phân bón" },
  { key: "quyCach", label: "Quy cách" },
  { key: "quyCachThung", label: "Quy cách thùng" },
  { key: "donGia", label: "Đơn giá" },
  { key: "tiTrong", label: "Tỉ trọng" },
]

export default function SanPhamTable({
  dataPromise,
  customers,
  ingredients,
  vatTus,
  page,
  onPageChange,
  onReload,
}: {
  dataPromise: Promise<{ items: Product[]; total: number }>
  customers: Customer[]
  ingredients: Ingredient[]
  vatTus: VatTu[]
  page: number
  onPageChange: (newPage: number) => void
  onReload: () => void
}) {
  const { items: products, total } = use(dataPromise)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ProductDraft>({
    mssp: "",
    mskh: "",
    tenThuongMai: "",
    tenPhanBon: "",
    quyCach: "",
    quyCachThung: "",
    donGia: "",
    tiTrong: "",
  })

  // Forward product dialog state
  const [forwardingProduct, setForwardingProduct] = useState<Product | null>(null)
  const [isForwardOpen, setIsForwardOpen] = useState(false)
  const [forwardDraft, setForwardDraft] = useState({
    mssp: "",
    mskh: "",
    tenThuongMai: "",
    tenPhanBon: "",
    quyCach: "",
    quyCachThung: "",
    donGia: "",
    tiTrong: "",
  })
  const [forwardVatTuRows, setForwardVatTuRows] = useState<VatTuRow[]>([])
  const [isSubmittingForward, setIsSubmittingForward] = useState(false)

  const [expandedFormulaId, setExpandedFormulaId] = useState<string | null>(null)
  const [expandedVatTuId, setExpandedVatTuId] = useState<string | null>(null)
  const [recipeRows, setRecipeRows] = useState<Record<string, Row[]>>({})
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null)
  const [vatTuEditRows, setVatTuEditRows] = useState<Record<string, VatTuRow[]>>({})
  const [savingVatTuId, setSavingVatTuId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "mssp", direction: "asc" })

  const [localPage, setLocalPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    setLocalPage(1)
  }, [products])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const left = a[sort.key]
      const right = b[sort.key]
      let result: number
      if (typeof left === "number" && typeof right === "number") {
        result = left - right
      } else {
        result = String(left ?? "").localeCompare(String(right ?? ""), "vi", { numeric: true })
      }
      return sort.direction === "asc" ? result : -result
    })
  }, [products, sort])

  const totalItems = sortedProducts.length
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(1, localPage), pageCount)

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedProducts.slice(start, start + pageSize)
  }, [sortedProducts, currentPage, pageSize])

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

  function getRecipeRows(product: Product): Row[] {
    return (
      recipeRows[product.mssp] ??
      product.nguyenLieu.map((item) => ({
        nguyenLieuId: item.nguyenLieu.id,
        dinhLuong: item.dinhLuong,
        isNew: false,
      }))
    )
  }

  function updateRecipeRow(mssp: string, index: number, field: keyof Row, value: string) {
    const product = products.find((item) => item.mssp === mssp)
    if (!product) return
    setRecipeRows((current) => ({
      ...current,
      [mssp]: getRecipeRows(product).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }))
  }

  async function saveRecipe(product: Product) {
    const recipe = getRecipeRows(product)
      .filter((row) => row.nguyenLieuId)
      .map((row) => ({ nguyenLieuId: row.nguyenLieuId, dinhLuong: Number(row.dinhLuong) }))
    setSavingRecipeId(product.mssp)
    const result = (await updateProductRecipe(product.mssp, recipe)) as { error?: string }
    setSavingRecipeId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật công thức")
      onReload()
    }
  }

  function getVatTuRows(product: Product): VatTuRow[] {
    return vatTuEditRows[product.mssp] ?? product.vatTu.map((item) => ({ ms: item.ms }))
  }

  function updateVatTuRow(mssp: string, index: number, ms: string) {
    const product = products.find((item) => item.mssp === mssp)
    if (!product) return
    setVatTuEditRows((current) => ({
      ...current,
      [mssp]: getVatTuRows(product).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ms } : item,
      ),
    }))
  }

  function removeVatTuRow(mssp: string, index: number) {
    const product = products.find((item) => item.mssp === mssp)
    if (!product) return
    setVatTuEditRows((current) => ({
      ...current,
      [mssp]: getVatTuRows(product).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function saveVatTu(product: Product) {
    setSavingVatTuId(product.mssp)
    const result = (await updateProductVatTu(
      product.mssp,
      getVatTuRows(product)
        .map((row) => row.ms)
        .filter(Boolean),
    )) as { error?: string }
    setSavingVatTuId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật vật tư")
      onReload()
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.mssp)
    setEditDraft({
      mssp: product.mssp,
      mskh: product.mskh,
      tenThuongMai: product.tenThuongMai ?? "",
      tenPhanBon: product.tenPhanBon ?? "",
      quyCach: product.quyCach,
      quyCachThung: product.quyCachThung,
      donGia: product.donGia,
      tiTrong: product.tiTrong != null ? String(product.tiTrong) : "",
    })
  }

  async function saveProduct(originalMssp: string) {
    if (
      !editDraft.mssp.trim() ||
      !editDraft.mskh.trim() ||
      !editDraft.quyCach.trim() ||
      !editDraft.quyCachThung ||
      !editDraft.donGia
    ) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc")
      return
    }
    const data = {
      mssp: editDraft.mssp.trim(),
      mskh: editDraft.mskh.trim(),
      tenThuongMai: editDraft.tenThuongMai.trim(),
      tenPhanBon: editDraft.tenPhanBon.trim(),
      quyCach: editDraft.quyCach.trim(),
      quyCachThung: Number(editDraft.quyCachThung),
      donGia: Number(editDraft.donGia),
      tiTrong: editDraft.tiTrong ? Number(editDraft.tiTrong) : null,
    }
    const result = (await updateProduct(originalMssp, data)) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật sản phẩm")
      setEditingId(null)
      onReload()
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return
    const result = (await deleteProductAction(id)) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã xóa sản phẩm")
      onReload()
    }
  }

  async function exportProductExcelFile(mssp: string) {
    try {
      const result = await exportProductExcelFileAction(mssp)
      if ("error" in result) {
        toast.error(result.error ?? `Không thể tạo công thức Excel ${mssp}`)
        return
      }

      downloadFile(result.data, result.fileName)
    } catch {
      toast.error("Có lỗi xảy ra khi xuất file Excel")
    }
  }

  function handleOpenForward(product: Product) {
    setForwardingProduct(product)
    setForwardDraft({
      mssp: "",
      mskh: product.mskh,
      tenThuongMai: product.tenThuongMai ?? "",
      tenPhanBon: product.tenPhanBon ?? "",
      quyCach: "",
      quyCachThung: "",
      donGia: product.donGia ?? "",
      tiTrong: product.tiTrong != null ? String(product.tiTrong) : "",
    })
    setForwardVatTuRows([])
    setIsForwardOpen(true)
  }

  async function handleCreateForwardProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!forwardingProduct) return

    if (!forwardDraft.mskh.trim()) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }

    if (!forwardDraft.mssp.trim()) {
      toast.error("Vui lòng nhập mã sản phẩm")
      return
    }

    if (!forwardDraft.quyCach.trim()) {
      toast.error("Vui lòng nhập quy cách")
      return
    }

    if (!forwardDraft.quyCachThung || Number(forwardDraft.quyCachThung) <= 0) {
      toast.error("Vui lòng nhập quy cách thùng hợp lệ")
      return
    }

    if (!forwardDraft.donGia || Number(forwardDraft.donGia) < 0) {
      toast.error("Vui lòng nhập đơn giá hợp lệ")
      return
    }

    const khoiLuong = calculateKhoiLuong(
      forwardDraft.quyCach,
      forwardDraft.tiTrong ? Number(forwardDraft.tiTrong) : null,
    )

    if (khoiLuong === null) {
      toast.error("Sản phẩm có nước / chất lỏng phải có tỉ trọng")
      return
    }

    const vatTuSelected = forwardVatTuRows.map((r) => r.ms).filter(Boolean)
    if (new Set(vatTuSelected).size !== vatTuSelected.length) {
      toast.error("Không được chọn trùng vật tư")
      return
    }

    setIsSubmittingForward(true)
    try {
      const res = await createProduct({
        mssp: forwardDraft.mssp.trim(),
        mskh: forwardDraft.mskh.trim(),
        tenThuongMai: forwardDraft.tenThuongMai.trim() || undefined,
        tenPhanBon: forwardDraft.tenPhanBon.trim() || undefined,
        quyCach: forwardDraft.quyCach.trim(),
        quyCachThung: Number(forwardDraft.quyCachThung),
        donGia: Number(forwardDraft.donGia),
        tiTrong: forwardDraft.tiTrong ? Number(forwardDraft.tiTrong) : null,
        nguyenLieu: forwardingProduct.nguyenLieu.map((item) => ({
          nguyenLieuId: item.nguyenLieu.id,
          dinhLuong: Number(item.dinhLuong),
        })),
        vatTu: vatTuSelected,
      })

      if ("error" in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success("Tạo sản phẩm mới thành công")
        setIsForwardOpen(false)
        setForwardingProduct(null)
        onReload()
      }
    } catch {
      toast.error("Có lỗi xảy ra khi tạo sản phẩm")
    } finally {
      setIsSubmittingForward(false)
    }
  }

  return (
    <>
      {/* Forward Product Dialog */}
      <Dialog open={isForwardOpen} onOpenChange={setIsForwardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-200 pb-3">
            <DialogTitle className="text-lg font-bold text-zinc-900">
              Tạo sản phẩm mới từ {forwardingProduct?.mssp}
            </DialogTitle>
          </DialogHeader>

          {forwardingProduct && (
            <form onSubmit={handleCreateForwardProduct} className="space-y-5 py-2 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Khách hàng */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Khách hàng (*)</label>
                  <Select
                    value={forwardDraft.mskh}
                    onValueChange={(val) => setForwardDraft({ ...forwardDraft, mskh: val ?? "" })}
                    required
                  >
                    <SelectTrigger className="w-full h-10 rounded-lg border-zinc-300 bg-white text-sm">
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

                {/* MSSP */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Mã sản phẩm (*)</label>
                  <input
                    value={forwardDraft.mssp}
                    onChange={(e) => setForwardDraft({ ...forwardDraft, mssp: e.target.value })}
                    placeholder="Nhập mã sản phẩm mới"
                    required
                    className="h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Đơn giá */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Đơn giá (*)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={forwardDraft.donGia}
                    onChange={(e) => setForwardDraft({ ...forwardDraft, donGia: e.target.value })}
                    placeholder="Nhập đơn giá"
                    required
                    className="h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Tỉ trọng */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Tỉ trọng (kg/lít, tùy chọn)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={forwardDraft.tiTrong}
                    onChange={(e) => setForwardDraft({ ...forwardDraft, tiTrong: e.target.value })}
                    placeholder="Nhập tỉ trọng"
                    className="h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Tên thương mại */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Tên thương mại (tùy chọn)</label>
                  <input
                    value={forwardDraft.tenThuongMai}
                    onChange={(e) => setForwardDraft({ ...forwardDraft, tenThuongMai: e.target.value })}
                    placeholder="Nhập tên thương mại"
                    className="h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Tên phân bón */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Tên phân bón (tùy chọn)</label>
                  <input
                    value={forwardDraft.tenPhanBon}
                    onChange={(e) => setForwardDraft({ ...forwardDraft, tenPhanBon: e.target.value })}
                    placeholder="Nhập tên phân bón"
                    className="h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Quy cách */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Quy cách (*)</label>
                  <input
                    value={forwardDraft.quyCach}
                    onChange={(e) => setForwardDraft({ ...forwardDraft, quyCach: e.target.value })}
                    placeholder="Ví dụ: 500ml, 1kg, 100gr"
                    required
                    className="h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Quy cách thùng */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">Quy cách thùng (*)</label>
                  <input
                    type="number"
                    min="1"
                    value={forwardDraft.quyCachThung}
                    onChange={(e) => setForwardDraft({ ...forwardDraft, quyCachThung: e.target.value })}
                    placeholder="Nhập quy cách thùng"
                    required
                    className="h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Danh sách nguyên liệu (giữ nguyên từ sản phẩm gốc) */}
              <div className="space-y-2 border-t border-zinc-200 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                    Nguyên liệu (giữ nguyên từ sản phẩm gốc)
                  </h4>
                  <span className="text-xs text-zinc-500">
                    {forwardingProduct.nguyenLieu.length} nguyên liệu
                  </span>
                </div>
                {forwardingProduct.nguyenLieu.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">Sản phẩm gốc không có nguyên liệu</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-zinc-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-100 text-zinc-600">
                        <tr>
                          <th className="p-2">Tên nguyên liệu</th>
                          <th className="p-2 text-right">Đơn giá</th>
                          <th className="p-2 text-right">Định lượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {forwardingProduct.nguyenLieu.map((nl) => (
                          <tr key={nl.nguyenLieu.id}>
                            <td className="p-2 font-medium text-zinc-900">{nl.nguyenLieu.ten}</td>
                            <td className="p-2 text-right text-zinc-600">
                              {nl.donGia ? `${formatPrice(Number(nl.donGia))} đ` : "—"}
                            </td>
                            <td className="p-2 text-right font-medium text-zinc-900">
                              {formatPrice(Number(nl.dinhLuong))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Danh sách vật tư mới (người dùng thêm mới) */}
              <div className="space-y-2 border-t border-zinc-200 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                    Vật tư mới
                  </h4>
                  <button
                    type="button"
                    onClick={() => setForwardVatTuRows((prev) => [...prev, { ms: "" }])}
                    className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer"
                  >
                    + Thêm vật tư
                  </button>
                </div>
                {forwardVatTuRows.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">Chưa chọn vật tư nào</p>
                ) : (
                  <div className="space-y-2">
                    {forwardVatTuRows.map((row, index) => {
                      const vtInfo = vatTus.find((v) => v.ms === row.ms)
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={row.ms}
                            onValueChange={(val) =>
                              setForwardVatTuRows((prev) =>
                                prev.map((item, i) => (i === index ? { ms: val ?? "" } : item)),
                              )
                            }
                          >
                            <SelectTrigger className="flex-1 h-9 rounded border-zinc-300 bg-white text-xs">
                              <SelectValue placeholder="Chọn vật tư" />
                            </SelectTrigger>
                            <SelectContent>
                              {vatTus.map((vt) => (
                                <SelectItem key={vt.ms} value={vt.ms}>
                                  {vt.ms} - {getLoaiVatTuLabel(vt.loai)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {vtInfo?.donGia != null && (
                            <span className="text-xs text-zinc-500 whitespace-nowrap">
                              {formatPrice(vtInfo.donGia)} đ
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setForwardVatTuRows((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                <button
                  type="button"
                  onClick={() => setIsForwardOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForward}
                  className="rounded-lg bg-green-900 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingForward ? "Đang tạo..." : "Tạo sản phẩm"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <table className="w-full min-w-300 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 sm:px-6">
                {column.key === "mssp" || column.key === "mskh" ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key as SortKey)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    {column.label}
                    {sortLabel(column.key as SortKey)}
                  </button>
                ) : (
                  <span className="font-semibold">{column.label}</span>
                )}
              </th>
            ))}
            <th className="px-3 py-3 sm:px-6">Công thức</th>
            <th className="px-3 py-3 sm:px-6">Vật tư</th>
            <th className="px-3 py-3 sm:px-6">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {paginatedProducts.map((product) => (
            <Fragment key={product.mssp}>
              {editingId === product.mssp ? (
                <tr className="border-t border-zinc-100 bg-zinc-50">
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      value={editDraft.mssp}
                      onChange={(e) => setEditDraft({ ...editDraft, mssp: e.target.value })}
                      required
                      className="w-full min-w-24 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <Select
                      value={editDraft.mskh}
                      onValueChange={(val) => setEditDraft({ ...editDraft, mskh: val ?? "" })}
                      required
                    >
                      <SelectTrigger className="w-full min-w-28 h-8 rounded border-zinc-300 bg-white">
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
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      value={editDraft.tenThuongMai}
                      onChange={(e) => setEditDraft({ ...editDraft, tenThuongMai: e.target.value })}
                      placeholder="Tùy chọn"
                      className="w-full min-w-28 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      value={editDraft.tenPhanBon}
                      onChange={(e) => setEditDraft({ ...editDraft, tenPhanBon: e.target.value })}
                      placeholder="Tùy chọn"
                      className="w-full min-w-28 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      value={editDraft.quyCach}
                      onChange={(e) => setEditDraft({ ...editDraft, quyCach: e.target.value })}
                      required
                      className="w-full min-w-20 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      type="number"
                      min="1"
                      value={editDraft.quyCachThung}
                      onChange={(e) => setEditDraft({ ...editDraft, quyCachThung: e.target.value })}
                      required
                      className="w-full min-w-16 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editDraft.donGia}
                      onChange={(e) => setEditDraft({ ...editDraft, donGia: e.target.value })}
                      required
                      className="w-full min-w-20 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={editDraft.tiTrong}
                      onChange={(e) => setEditDraft({ ...editDraft, tiTrong: e.target.value })}
                      className="w-full min-w-16 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6" />
                  <td className="px-3 py-2 sm:px-6" />
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex items-center gap-2">
                      <SaveButton onClick={() => void saveProduct(product.mssp)} />
                      <CancelButton onClick={() => setEditingId(null)} />
                    </div>
                  </td>
                </tr>
              ) : (
                <tr className="border-t border-zinc-100">
                  <td className="px-3 py-2 font-medium text-zinc-900 sm:px-6">{product.mssp}</td>
                  <td className="px-3 py-2 sm:px-6">{product.khachHang?.ten ?? product.mskh}</td>
                  <td className="px-3 py-2 sm:px-6">{product.tenThuongMai || "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{product.tenPhanBon || "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{product.quyCach}</td>
                  <td className="px-3 py-2 sm:px-6">{product.quyCachThung}</td>
                  <td className="px-3 py-2 sm:px-6">{formatPrice(Number(product.donGia))}</td>
                  <td className="px-3 py-2 sm:px-6">{product.tiTrong ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">
                    {expandedFormulaId === product.mssp ? (
                      <CloseButton onClick={() => setExpandedFormulaId(null)} />
                    ) : (
                      <ViewButton onClick={() => {
                        setExpandedFormulaId(product.mssp)
                        setExpandedVatTuId(null)
                      }} />
                    )}
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    {expandedVatTuId === product.mssp ? (
                      <CloseButton onClick={() => setExpandedVatTuId(null)} />
                    ) : (
                      <ViewButton onClick={() => {
                        setExpandedVatTuId(product.mssp)
                        setExpandedFormulaId(null)
                      }} />
                    )}
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex items-center gap-2">
                      <EditButton onClick={() => startEdit(product)} />
                      <ForwardButton onClick={() => handleOpenForward(product)} />
                      <DeleteButton onClick={() => void deleteProduct(product.mssp)} />
                      <ExcelButton onClick={() => exportProductExcelFile(product.mssp)} />
                    </div>
                  </td>
                </tr>
              )}

              {expandedFormulaId === product.mssp && (
                <tr className="bg-zinc-50">
                  <td colSpan={11} className="p-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
                      <h4 className="font-semibold text-zinc-900">
                        Công thức của {product.mssp} - {product.tenThuongMai}
                      </h4>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-zinc-500">
                            <th className="px-3 py-2">Nguyên liệu</th>
                            <th className="px-3 py-2">Đơn giá</th>
                            <th className="px-3 py-2">Định lượng</th>
                            <th className="px-3 py-2">Thành tiền</th>
                            <th className="px-3 py-2">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getRecipeRows(product).map((row, index) => {
                            const ing =
                              ingredients.find((item) => item.id === row.nguyenLieuId) ??
                              product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)?.nguyenLieu
                            const donGia = Number(
                              ing?.donGia ??
                                product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)?.donGia ??
                                0,
                            )
                            const dinhLuong = Number(row.dinhLuong || 0)
                            const tongTien = donGia * dinhLuong
                            return (
                              <tr key={`${product.mssp}-${index}`} className="border-t border-zinc-200">
                                <td className="px-3 py-2">
                                  {row.isNew ? (
                                    <Select
                                      value={row.nguyenLieuId}
                                      onValueChange={(val) =>
                                        updateRecipeRow(product.mssp, index, "nguyenLieuId", val ?? "")
                                      }
                                      required
                                    >
                                      <SelectTrigger className="w-full h-8 rounded border-zinc-300 bg-white">
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
                                  ) : (
                                    <span>{ing?.ten ?? row.nguyenLieuId}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{formatPrice(donGia)}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    value={row.dinhLuong}
                                    onChange={(event) =>
                                      updateRecipeRow(product.mssp, index, "dinhLuong", event.target.value)
                                    }
                                    className="w-24 rounded border border-zinc-300 px-2 py-1"
                                  />
                                </td>
                                <td className="px-3 py-2">{formatPrice(tongTien)}</td>
                                <td className="px-3 py-2">
                                  <DeleteButton onClick={() =>
                                      setRecipeRows((current) => ({
                                        ...current,
                                        [product.mssp]: getRecipeRows(product).filter(
                                            (_, rowIndex) => rowIndex !== index,
                                        ),
                                      }))
                                  }/>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-zinc-300 font-semibold text-zinc-900">
                            <td className="px-3 py-2">Tổng</td>
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2">
                              {getRecipeRows(product)
                                .reduce((sum, row) => sum + Number(row.dinhLuong || 0), 0)
                                .toFixed(3)}
                            </td>
                            <td className="px-3 py-2">
                              {formatPrice(
                                getRecipeRows(product).reduce((sum, row) => {
                                  const ing =
                                    ingredients.find((item) => item.id === row.nguyenLieuId) ??
                                    product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)
                                      ?.nguyenLieu
                                  const donGia = Number(
                                    ing?.donGia ??
                                      product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)
                                        ?.donGia ??
                                      0,
                                  )
                                  return sum + donGia * Number(row.dinhLuong || 0)
                                }, 0),
                              )}
                            </td>
                            <td className="px-3 py-2" />
                          </tr>
                        </tfoot>
                      </table>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRecipeRows((current) => ({
                              ...current,
                              [product.mssp]: [
                                ...getRecipeRows(product),
                                { nguyenLieuId: "", dinhLuong: "", isNew: true },
                              ],
                            }))
                          }
                          className="rounded-lg border px-3 py-2 hover:bg-zinc-100 hover:cursor-pointer"
                        >
                          Thêm nguyên liệu
                        </button>
                        <button
                          type="button"
                          disabled={savingRecipeId === product.mssp}
                          onClick={() => void saveRecipe(product)}
                          className="rounded-lg bg-green-900 px-3 py-2 text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50"
                        >
                          Lưu công thức
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {expandedVatTuId === product.mssp && (
                <tr className="bg-zinc-50">
                  <td colSpan={11} className="p-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
                      <h4 className="font-semibold text-zinc-900">
                        Vật tư cho {product.mssp} - {product.tenThuongMai}
                      </h4>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2">Vật tư</th>
                            <th className="px-3 py-2">Đơn giá</th>
                            <th className="px-3 py-2">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getVatTuRows(product).map((row, index) => {
                            const vatTuInfo =
                              vatTus.find((v) => v.ms === row.ms) ?? product.vatTu.find((v) => v.ms === row.ms)
                            const currentPrice =
                              vatTuInfo?.donGia != null ? formatPrice(vatTuInfo.donGia) : "-"
                            return (
                              <tr key={`${product.mssp}-vat-tu-${index}`} className="border-t border-zinc-200">
                                <td className="px-3 py-2">
                                  {row.isNew ? (
                                    <Select
                                      value={row.ms}
                                      onValueChange={(val) =>
                                        updateVatTuRow(product.mssp, index, val ?? "")
                                      }
                                    >
                                      <SelectTrigger className="w-full h-8 rounded border-zinc-300 bg-white">
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
                                  ) : (
                                    <span>{vatTuInfo ? `${vatTuInfo.ms} - ${getLoaiVatTuLabel(vatTuInfo.loai)}` : row.ms}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{currentPrice}</td>
                                <td className="px-3 py-2">
                                  <DeleteButton onClick={() => removeVatTuRow(product.mssp, index)} />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setVatTuEditRows((current) => ({
                              ...current,
                              [product.mssp]: [...getVatTuRows(product), { ms: "", isNew: true }],
                            }))
                          }
                          className="rounded-lg border px-3 py-2 hover:bg-zinc-100"
                        >
                          Thêm vật tư
                        </button>
                        <button
                          type="button"
                          disabled={savingVatTuId === product.mssp}
                          onClick={() => void saveVatTu(product)}
                          className="rounded-lg bg-green-900 px-3 py-2 text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50"
                        >
                          Lưu vật tư
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
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
                const next = Math.max(1, currentPage - 1)
                setLocalPage(next)
                onPageChange?.(next)
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-3 text-sm">
              {currentPage} / {pageCount}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              text="Sau"
              href="#"
              onClick={(e) => {
                e.preventDefault()
                const next = Math.min(pageCount, currentPage + 1)
                setLocalPage(next)
                onPageChange?.(next)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </>
  )
}
