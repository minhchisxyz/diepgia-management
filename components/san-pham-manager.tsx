"use client"

import { Fragment, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { downloadFile, formatPrice } from "@/lib/utils"
import { listCustomers } from "@/app/actions/khach-hang/data"
import { listIngredients } from "@/app/actions/nguyen-lieu/data"
import { listVatTu } from "@/app/actions/vat-tu/data"
import {
  createProduct,
  listProducts,
  updateProduct,
  updateProductRecipe,
  updateProductVatTu,
  deleteProduct as deleteProductAction,
  exportProductExcelFile as exportProductExcelFileAction,
} from "../app/actions/san-pham/data"
import {
  CancelButton,
  CloseViewFormulaButton,
  DeleteButton,
  EditButton,
  ExcelButton,
  SaveButton,
  ViewFormulaButton,
} from "@/components/buttons"

type Customer = { mskh: string; ten: string }
type Ingredient = { id: string; ten: string; donVi: string; loai: string; donGia?: string | null }
type VatTu = { ms: string; ten: string; kho: number; donGia: string | null }
type ProductIngredient = {
  nguyenLieu: Ingredient
  dinhLuong: string
  donGia?: string | null
}
type Product = {
  mssp: string
  mskh: string
  tenThuongMai: string
  tenPhanBon: string
  quyCach: string
  quyCachThung: string
  donGia: string
  tiTrong: number | null
  khachHang: Customer
  nguyenLieu: ProductIngredient[]
  vatTu: VatTu[]
}

type Row = { nguyenLieuId: string; dinhLuong: string; isNew?: boolean }
type VatTuRow = { ms: string; isNew?: boolean }
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

const emptyRows: Row[] = [{ nguyenLieuId: "", dinhLuong: "" }]

export default function SanPhamManager() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [vatTus, setVatTus] = useState<VatTu[]>([])
  const [vatTuRows, setVatTuRows] = useState<VatTuRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState("")

  // Form states for creating a new product
  const [mssp, setMssp] = useState("")
  const [mskh, setMskh] = useState("")
  const [tenThuongMai, setTenThuongMai] = useState("")
  const [tenPhanBon, setTenPhanBon] = useState("")
  const [quyCach, setQuyCach] = useState("")
  const [quyCachThung, setQuyCachThung] = useState("")
  const [donGia, setDonGia] = useState("")
  const [tiTrong, setTiTrong] = useState("")
  const [rows, setRows] = useState<Row[]>(emptyRows)

  // Inline row edit states
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

  const [expandedFormulaId, setExpandedFormulaId] = useState<string | null>(null)
  const [expandedVatTuId, setExpandedVatTuId] = useState<string | null>(null)
  const [recipeRows, setRecipeRows] = useState<Record<string, Row[]>>({})
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null)
  const [vatTuEditRows, setVatTuEditRows] = useState<Record<string, VatTuRow[]>>({})
  const [savingVatTuId, setSavingVatTuId] = useState<string | null>(null)
  const [filters, setFilters] = useState({ search: "" })
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "mssp", direction: "asc" })
  const [message, setMessage] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load(customer = selectedCustomer, search = filters.search, targetPage = page) {
    const [customersRes, ingredientsRes, vatTusRes, productsRes] = await Promise.all([
      listCustomers(``, 1, 100),
      listIngredients(``, 1, 100),
      listVatTu(``, 1, 100),
      listProducts(search, targetPage, 10, customer),
    ])
    setCustomers(customersRes.items as Customer[])
    setIngredients(ingredientsRes.items as Ingredient[])
    setVatTus(vatTusRes.items as VatTu[])
    setProducts(productsRes.items as unknown as Product[])
    setTotal(productsRes.total)
  }

  function getRecipeRows(product: Product): Row[] {
    return recipeRows[product.mssp] ?? product.nguyenLieu.map((item) => ({
      nguyenLieuId: item.nguyenLieu.id,
      dinhLuong: item.dinhLuong,
      isNew: false,
    }))
  }

  function updateRecipeRow(mssp: string, index: number, field: keyof Row, value: string) {
    const product = products.find((item) => item.mssp === mssp)
    if (!product) return
    setRecipeRows((current) => ({
      ...current,
      [mssp]: getRecipeRows(product).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row),
    }))
  }

  async function saveRecipe(product: Product) {
    const recipe = getRecipeRows(product)
      .filter((row) => row.nguyenLieuId)
      .map((row) => ({ nguyenLieuId: row.nguyenLieuId, dinhLuong: Number(row.dinhLuong) }))
    setSavingRecipeId(product.mssp)
    const result = await updateProductRecipe(product.mssp, recipe) as { error?: string }
    setSavingRecipeId(null)
    setMessage(result.error ?? `Đã cập nhật công thức`)
    if (!result.error) await load()
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
        itemIndex === index ? { ...item, ms } : item
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
    const result = await updateProductVatTu(
      product.mssp,
      getVatTuRows(product).map((row) => row.ms).filter(Boolean),
    ) as { error?: string }
    setSavingVatTuId(null)
    setMessage(result.error ?? `Đã cập nhật vật tư`)
    if (!result.error) await load()
  }

  useEffect(() => {
    let active = true
    Promise.all([
      listCustomers(``, 1, 100),
      listIngredients(``, 1, 100),
      listProducts(``, 1, 10),
      listVatTu(``, 1, 100),
    ])
      .then(async ([customersRes, ingredientsRes, productsRes, vatTusRes]) => {
        if (!active) return
        setCustomers(customersRes.items as Customer[])
        setIngredients(ingredientsRes.items as Ingredient[])
        setVatTus(vatTusRes.items as VatTu[])
        setProducts(productsRes.items as unknown as Product[])
        setTotal(productsRes.total)
      })
      .catch(() => {
        if (active) setMessage("Không thể tải dữ liệu sản phẩm")
      })
    return () => {
      active = false
    }
  }, [])

  const sortedProducts = useMemo(() => [...products].sort((a, b) => {
    const result = String(a[sort.key]).localeCompare(String(b[sort.key]), "vi")
    return sort.direction === "asc" ? result : -result
  }), [products, sort])
  const pageCount = Math.max(1, Math.ceil(total / 10))

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" })
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕"
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
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
    setRows(emptyRows)
    setVatTuRows([])
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const productIngredients = rows
      .filter((row) => row.nguyenLieuId && row.dinhLuong)
      .map((row) => ({ nguyenLieuId: row.nguyenLieuId, dinhLuong: Number(row.dinhLuong) }))
    if (productIngredients.some((row) => !Number.isFinite(row.dinhLuong) || row.dinhLuong <= 0)) {
      setMessage(`Định lượng nguyên liệu phải lớn hơn 0`)
      return
    }
    const data = {
      mssp,
      mskh,
      tenThuongMai,
      tenPhanBon,
      quyCach,
      quyCachThung: Number(quyCachThung),
      donGia: Number(donGia),
      tiTrong: tiTrong ? Number(tiTrong) : null,
      nguyenLieu: productIngredients,
      vatTu: vatTuRows.map((row) => row.ms).filter(Boolean),
    }
    const result = await createProduct(data) as { error?: string }
    setMessage(result.error ? result.error : "Đã tạo sản phẩm")
    if (!result.error) {
      resetCreateForm()
      await load()
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.mssp)
    setEditDraft({
      mssp: product.mssp,
      mskh: product.mskh,
      tenThuongMai: product.tenThuongMai,
      tenPhanBon: product.tenPhanBon,
      quyCach: product.quyCach,
      quyCachThung: product.quyCachThung,
      donGia: product.donGia,
      tiTrong: product.tiTrong != null ? String(product.tiTrong) : "",
    })
  }

  async function saveProduct(originalMssp: string) {
    if (!editDraft.mssp.trim() || !editDraft.mskh.trim() || !editDraft.tenThuongMai.trim() || !editDraft.tenPhanBon.trim() || !editDraft.quyCach.trim() || !editDraft.quyCachThung || !editDraft.donGia) {
      setMessage("Vui lòng điền đầy đủ các thông tin bắt buộc")
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
    const result = await updateProduct(originalMssp, data) as { error?: string }
    setMessage(result.error ? result.error : "Đã cập nhật sản phẩm")
    if (!result.error) {
      setEditingId(null)
      await load()
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return
    const result = await deleteProductAction(id) as { error?: string }
    setMessage(result.error ? result.error : "Đã xóa sản phẩm")
    if (!result.error) await load()
  }

  async function exportProductExcelFile(mssp: string) {
    try {
      const result = await exportProductExcelFileAction(mssp)
      if (`error` in result) {
        setMessage(result.error ?? `Không thể tạo công thức Excel ${mssp}`)
        return
      }

      downloadFile(result.data, result.fileName)
    } catch (error) {
      setMessage("Có lỗi xảy ra khi xuất file Excel")
    }
  }

  const columns: { key: keyof Pick<Product, "mssp" | "tenThuongMai" | "tenPhanBon" | "quyCach" | "quyCachThung" | "donGia" | "mskh" | "tiTrong">; label: string }[] = [
    { key: "mssp", label: "Mã sản phẩm" },
    { key: "mskh", label: "Mã khách hàng" },
    { key: "tenThuongMai", label: "Tên thương mại" },
    { key: "tenPhanBon", label: "Tên phân bón" },
    { key: "quyCach", label: "Quy cách" },
    { key: "quyCachThung", label: "Quy cách thùng" },
    { key: "donGia", label: "Đơn giá" },
    { key: "tiTrong", label: "Tỉ trọng" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Sản phẩm</h1>
          <form onSubmit={handleCreateProduct} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã sản phẩm (*)
              <input value={mssp}
                     onChange={(event) => setMssp(event.target.value)}
                     placeholder="Nhập mã sản phẩm"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Khách hàng (*)
              <select value={mskh}
                      onChange={(event) => setMskh(event.target.value)}
                      required
                      className="rounded-lg border border-zinc-300 px-3 py-2 font-normal">
                <option value="">Chọn khách hàng</option>
                {customers.map((customer) => <option key={customer.mskh}
                                                     value={customer.mskh}>{customer.mskh} - {customer.ten}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên thương mại (*)
              <input value={tenThuongMai}
                     onChange={(event) => setTenThuongMai(event.target.value)}
                     placeholder="Nhập tên thương mại"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên phân bón (*)
              <input value={tenPhanBon}
                     onChange={(event) => setTenPhanBon(event.target.value)}
                     placeholder="Nhập tên phân bón"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Quy cách (*)
              <input value={quyCach}
                     onChange={(event) => setQuyCach(event.target.value)}
                     placeholder="Nhập quy cách"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Quy cách thùng (*)
              <input value={quyCachThung}
                     onChange={(event) => setQuyCachThung(event.target.value)}
                     placeholder="Nhập quy cách thùng"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Đơn giá (*)
              <input type="number"
                     min="0"
                     step="0.001"
                     value={donGia}
                     onChange={(event) => setDonGia(event.target.value)}
                     placeholder="Nhập đơn giá"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tỉ trọng
              <input type="number"
                     min="0"
                     step="0.001"
                     value={tiTrong}
                     onChange={(event) => setTiTrong(event.target.value)}
                     placeholder="Nhập tỉ trọng (tùy chọn)"
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <p className="text-sm font-medium text-zinc-700">Nguyên liệu (*):</p>
              {rows.map((row, index) =>
                  <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                    <select value={row.nguyenLieuId}
                            onChange={(event) => updateRow(index, "nguyenLieuId", event.target.value)}
                            required
                            className="rounded-lg border border-zinc-300 px-3 py-2">
                      <option value="">Chọn nguyên liệu</option>
                      {ingredients.map((item) => <option key={item.id}
                                                         value={item.id}>{item.ten} - {item.loai} ({item.donVi})</option>)}
                    </select>
                    <input type="number"
                           min="0.001"
                           step="0.001"
                           value={row.dinhLuong}
                           onChange={(event) => updateRow(index, "dinhLuong", event.target.value)}
                           placeholder="Định lượng"
                           required
                           className="rounded-lg border border-zinc-300 px-3 py-2"/>
                    <button type="button"
                            onClick={() => setRows((current) => current.length === 1
                              ? [{ nguyenLieuId: ``, dinhLuong: `` }]
                              : current.filter((_, rowIndex) => rowIndex !== index))}
                            className="rounded-lg border px-3 py-2">Xóa
                    </button>
                  </div>)}
              <button type="button"
                      onClick={() => setRows((current) => [...current, {nguyenLieuId: "", dinhLuong: ""}])}
                      className="rounded-lg border px-4 py-2">Thêm nguyên liệu
              </button>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <p className="text-sm font-medium text-zinc-700">Vật tư:</p>
              {vatTuRows.map((row, index) => {
                const vatTuInfo = vatTus.find((v) => v.ms === row.ms)
                return (
                  <div key={index} className="flex items-center gap-3">
                    <select value={row.ms}
                            onChange={(event) => setVatTuRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ms: event.target.value } : item))}
                            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2">
                      <option value="">Chọn vật tư</option>
                      {vatTus.map((vatTu) => <option key={vatTu.ms} value={vatTu.ms}>{vatTu.ms} - {vatTu.ten}</option>)}
                    </select>
                    {vatTuInfo?.donGia != null && (
                      <span className="text-sm text-zinc-500 whitespace-nowrap">Đơn giá: {formatPrice(vatTuInfo.donGia)}</span>
                    )}
                    <button type="button" onClick={() => setVatTuRows((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border px-3 py-2">Xóa</button>
                  </div>
                )
              })}
              <button type="button" onClick={() => setVatTuRows((current) => [...current, { ms: ``, isNew: true }])} className="rounded-lg border px-4 py-2">Thêm vật tư</button>
            </div>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 lg:col-span-4">Tạo sản phẩm</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900 whitespace-nowrap">Danh sách sản phẩm</h2>
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <select
                value={selectedCustomer}
                onChange={(event) => {
                  const customer = event.target.value
                  setSelectedCustomer(customer)
                  setPage(1)
                  void listProducts(filters.search, 1, 10, customer).then((result) => {
                    setProducts(result.items as unknown as Product[])
                    setTotal(result.total)
                  })
                }}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-xs"
              >
                <option value="">Tất cả khách hàng</option>
                {customers.map((customer) => (
                  <option key={customer.mskh} value={customer.mskh}>
                    {customer.mskh} - {customer.ten}
                  </option>
                ))}
              </select>
              <input value={filters.search}
                     onChange={(event) => {
                       const search = event.target.value
                       setFilters({ search })
                       if (searchTimer.current) clearTimeout(searchTimer.current)
                       searchTimer.current = setTimeout(() => {
                         setPage(1)
                         void listProducts(search, 1, 10, selectedCustomer)
                           .then((result) => {
                             setProducts(result.items as unknown as Product[])
                             setTotal(result.total)
                           })
                       }, 500)
                     }}
                     placeholder="Tìm mã sản phẩm"
                     className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"/>
            </div>
          </div>
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>
                {columns.map((column) =>
                    <th key={column.key} className="px-3 py-2 sm:px-6">
                      {column.key === "mssp" || column.key === "mskh" ? (
                        <button type="button"
                                onClick={() => toggleSort(column.key as SortKey)}
                                className="font-semibold hover:text-zinc-900">
                          {column.label}{sortLabel(column.key as SortKey)}
                        </button>
                      ) : (
                        <span className="font-semibold">{column.label}</span>
                      )}
                    </th>)}
                <th className="px-3 py-3 sm:px-6">Công thức</th>
                <th className="px-3 py-3 sm:px-6">Vật tư</th>
                <th className="px-3 py-3 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>{sortedProducts.map((product) => <Fragment key={product.mssp}>
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
                    <select
                      value={editDraft.mskh}
                      onChange={(e) => setEditDraft({ ...editDraft, mskh: e.target.value })}
                      required
                      className="w-full min-w-28 rounded border border-zinc-300 px-2 py-1"
                    >
                      <option value="">Chọn khách hàng</option>
                      {customers.map((c) => (
                        <option key={c.mskh} value={c.mskh}>
                          {c.mskh} - {c.ten}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      value={editDraft.tenThuongMai}
                      onChange={(e) => setEditDraft({ ...editDraft, tenThuongMai: e.target.value })}
                      required
                      className="w-full min-w-28 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      value={editDraft.tenPhanBon}
                      onChange={(e) => setEditDraft({ ...editDraft, tenPhanBon: e.target.value })}
                      required
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
                      className="w-full min-w-20 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={editDraft.donGia}
                      onChange={(e) => setEditDraft({ ...editDraft, donGia: e.target.value })}
                      required
                      className="w-full min-w-24 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={editDraft.tiTrong}
                      onChange={(e) => setEditDraft({ ...editDraft, tiTrong: e.target.value })}
                      placeholder="Tùy chọn"
                      className="w-full min-w-20 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    {expandedFormulaId === product.mssp ?
                        <CloseViewFormulaButton onClick={() => setExpandedFormulaId(null)}/> :
                        <ViewFormulaButton onClick={() => {
                          setExpandedFormulaId(product.mssp)
                          setExpandedVatTuId(null)
                        }}/>}
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    {expandedVatTuId === product.mssp ?
                        <CloseViewFormulaButton onClick={() => setExpandedVatTuId(null)}/> :
                        <ViewFormulaButton onClick={() => {
                          setExpandedVatTuId(product.mssp)
                          setExpandedFormulaId(null)
                        }}/>}
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex gap-2">
                      <SaveButton onClick={() => void saveProduct(product.mssp)} />
                      <CancelButton onClick={() => setEditingId(null)} />
                    </div>
                  </td>
                </tr>
              ) : (
                <tr className="border-t border-zinc-100">
                  <td className="px-3 py-2 sm:px-6">{product.mssp}</td>
                  <td className="px-3 py-2 sm:px-6">{product.mskh}</td>
                  <td className="px-3 py-2 sm:px-6">{product.tenThuongMai}</td>
                  <td className="px-3 py-2 sm:px-6">{product.tenPhanBon}</td>
                  <td className="px-3 py-2 sm:px-6">{product.quyCach}</td>
                  <td className="px-3 py-2 sm:px-6">{product.quyCachThung}</td>
                  <td className="px-3 py-2 sm:px-6">{formatPrice(product.donGia)}</td>
                  <td className="px-3 py-2 sm:px-6">{product.tiTrong != null ? product.tiTrong : ""}</td>
                  <td className="px-3 py-2 sm:px-6">
                    {expandedFormulaId === product.mssp ?
                        <CloseViewFormulaButton onClick={() => setExpandedFormulaId(null)}/> :
                        <ViewFormulaButton onClick={() => {
                          setExpandedFormulaId(product.mssp)
                          setExpandedVatTuId(null)
                        }}/>}
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    {expandedVatTuId === product.mssp ?
                        <CloseViewFormulaButton onClick={() => setExpandedVatTuId(null)}/> :
                        <ViewFormulaButton onClick={() => {
                          setExpandedVatTuId(product.mssp)
                          setExpandedFormulaId(null)
                        }}/>}
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex gap-3">
                      <ExcelButton onClick={() => exportProductExcelFile(product.mssp)}/>
                      <EditButton onClick={() => startEdit(product)}/>
                      <DeleteButton onClick={() => void deleteProduct(product.mssp)}/>
                    </div>
                  </td>
                </tr>
              )}
              {expandedFormulaId === product.mssp && <tr className="bg-zinc-50">
                <td colSpan={11} className="px-3 py-3 sm:px-6">
                  <div className="mx-auto w-full max-w-3xl overflow-x-auto">
                    <p className="mb-2 font-medium text-zinc-800">Công thức nguyên liệu</p>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-100 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2">Nguyên liệu</th>
                          <th className="px-3 py-2">Định lượng</th>
                          <th className="px-3 py-2">Đơn giá</th>
                          <th className="px-3 py-2">Tổng tiền</th>
                          <th className="px-3 py-2">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getRecipeRows(product).map((row, index) => {
                          const ing = ingredients.find((item) => item.id === row.nguyenLieuId)
                            ?? product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)?.nguyenLieu
                          const donGia = Number(ing?.donGia ?? product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)?.donGia ?? 0)
                          const dinhLuong = Number(row.dinhLuong || 0)
                          const tongTien = donGia * dinhLuong
                          return (
                            <tr key={`${product.mssp}-${index}`} className="border-t border-zinc-200">
                              <td className="px-3 py-2">
                                {row.isNew
                                  ? <select value={row.nguyenLieuId}
                                            onChange={(event) => updateRecipeRow(product.mssp, index, `nguyenLieuId`, event.target.value)}
                                            className="w-full rounded border border-zinc-300 px-2 py-1">
                                      <option value="">Chọn nguyên liệu</option>
                                      {ingredients.map((item) => <option key={item.id} value={item.id}>{item.ten} - {item.loai} ({item.donVi})</option>)}
                                    </select>
                                  : <span>
                                      {ing?.ten ?? row.nguyenLieuId}
                                    </span>}
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="0.001" step="0.001" value={row.dinhLuong}
                                       onChange={(event) => updateRecipeRow(product.mssp, index, `dinhLuong`, event.target.value)}
                                       className="w-28 rounded border border-zinc-300 px-2 py-1"/>
                              </td>
                              <td className="px-3 py-2">{formatPrice(donGia)}</td>
                              <td className="px-3 py-2">{formatPrice(tongTien)}</td>
                              <td className="px-3 py-2">
                                <DeleteButton onClick={() => setRecipeRows((current) => ({
                                  ...current,
                                  [product.mssp]: getRecipeRows(product).filter((_, rowIndex) => rowIndex !== index),
                                }))}/>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const recipeItems = getRecipeRows(product)
                          let totalDinhLuong = 0
                          let totalTongTien = 0
                          recipeItems.forEach((row) => {
                            const ing = ingredients.find((item) => item.id === row.nguyenLieuId)
                              ?? product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)?.nguyenLieu
                            const donGia = Number(ing?.donGia ?? product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)?.donGia ?? 0)
                            const dl = Number(row.dinhLuong || 0)
                            totalDinhLuong += dl
                            totalTongTien += dl * donGia
                          })
                          return (
                            <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                              <td className="px-3 py-2">Tổng cộng</td>
                              <td className="px-3 py-2">{formatPrice(totalDinhLuong)}</td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2">{formatPrice(totalTongTien)}</td>
                              <td className="px-3 py-2"></td>
                            </tr>
                          )
                        })()}
                      </tfoot>
                    </table>
                    <div className="mt-3 flex gap-3">
                      <button type="button" onClick={() => setRecipeRows((current) => ({
                        ...current,
                        [product.mssp]: [...getRecipeRows(product), { nguyenLieuId: ``, dinhLuong: ``, isNew: true }],
                      }))} className="rounded-lg border px-3 py-2">Thêm nguyên liệu</button>
                      <button type="button"
                              disabled={savingRecipeId === product.mssp}
                              onClick={() => void saveRecipe(product)}
                              className="rounded-lg bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">Lưu công thức
                      </button>
                    </div>
                  </div>
                </td>
              </tr>}
              {expandedVatTuId === product.mssp && <tr className="bg-zinc-50">
                <td colSpan={11} className="px-3 py-3 sm:px-6">
                  <div className="mx-auto w-full max-w-3xl overflow-x-auto">
                    <p className="mb-2 font-medium text-zinc-800">Danh sách vật tư</p>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-100 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2">Vật tư</th>
                          <th className="px-3 py-2">Đơn giá hiện tại</th>
                          <th className="px-3 py-2">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getVatTuRows(product).map((row, index) => {
                          const vatTuInfo = vatTus.find((v) => v.ms === row.ms) ?? product.vatTu.find((v) => v.ms === row.ms)
                          const currentPrice = vatTuInfo?.donGia != null ? formatPrice(vatTuInfo.donGia) : "-"
                          return (
                            <tr key={`${product.mssp}-vat-tu-${index}`} className="border-t border-zinc-200">
                              <td className="px-3 py-2">
                                {row.isNew ? (
                                  <select
                                    value={row.ms}
                                    onChange={(event) => updateVatTuRow(product.mssp, index, event.target.value)}
                                    className="w-full rounded border border-zinc-300 px-2 py-1"
                                  >
                                    <option value="">Chọn vật tư</option>
                                    {vatTus.map((vatTu) => (
                                      <option key={vatTu.ms} value={vatTu.ms}>
                                        {vatTu.ms} - {vatTu.ten}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span>{vatTuInfo ? `${vatTuInfo.ms} - ${vatTuInfo.ten}` : row.ms}</span>
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
                    <div className="mt-3 flex gap-3">
                      <button type="button" onClick={() => setVatTuEditRows((current) => ({
                        ...current,
                        [product.mssp]: [...getVatTuRows(product), { ms: ``, isNew: true }],
                      }))} className="rounded-lg border px-3 py-2">Thêm vật tư</button>
                      <button type="button" disabled={savingVatTuId === product.mssp} onClick={() => void saveVatTu(product)} className="rounded-lg bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">Lưu vật tư</button>
                    </div>
                  </div>
                </td>
              </tr>}
            </Fragment>)}</tbody>
          </table>
          <Pagination className="p-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="Trước"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const next = Math.max(1, page - 1);
                    setPage(next);
                    void listProducts(filters.search, next, 10, selectedCustomer).then((r) => {
                      setProducts(r.items as unknown as Product[]);
                      setTotal(r.total);
                    });
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm">{page} / {pageCount}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  text="Sau"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const next = Math.min(pageCount, page + 1);
                    setPage(next);
                    void listProducts(filters.search, next, 10, selectedCustomer).then((r) => {
                      setProducts(r.items as unknown as Product[]);
                      setTotal(r.total);
                    });
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
