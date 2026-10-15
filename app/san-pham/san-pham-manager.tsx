"use client"

import { Fragment, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import {downloadFile, formatPrice} from "@/lib/utils"
import { listCustomers } from "../actions/khach-hang/data"
import {listIngredients} from "@/app/actions/nguyen-lieu/data";
import {listVatTu } from "../actions/vat-tu/data"
import {
  createProduct,
  listProducts,
  updateProduct,
  updateProductRecipe,
  updateProductVatTu,
  deleteProduct as deleteProductAction,
  exportProductExcelFile as exportProductExcelFileAction,
} from "../actions/san-pham/data"

type Customer = { mskh: string; ten: string }
type Ingredient = { id: string; ten: string; donVi: string; loai: string }
type VatTu = { ms: string; ten: string; kho: number; donGia: string | null }
type ProductIngredient = { nguyenLieu: Ingredient; giaTri: string }
type Product = {
  mssp: string
  mskh: string
  tenThuongMai: string
  tenPhanBon: string
  quyCach: string
  quyCachThung: string
  donGia: string
  khachHang: Customer
  nguyenLieu: ProductIngredient[]
  vatTu: VatTu[]
}

type Row = { nguyenLieuId: string; giaTri: string; isNew?: boolean }
type VatTuRow = { ms: string; isNew?: boolean }
type SortKey = keyof Pick<Product, "mssp" | "tenThuongMai" | "tenPhanBon" | "quyCach" | "quyCachThung" | "donGia" | "mskh">

const emptyRows = [{ nguyenLieuId: "", giaTri: "" }]

export default function SanPhamManager() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [vatTus, setVatTus] = useState<VatTu[]>([])
  const [vatTuRows, setVatTuRows] = useState<VatTuRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [mssp, setMssp] = useState("")
  const [mskh, setMskh] = useState("")
  const [tenThuongMai, setTenThuongMai] = useState("")
  const [tenPhanBon, setTenPhanBon] = useState("")
  const [quyCach, setQuyCach] = useState("")
  const [quyCachThung, setQuyCachThung] = useState("")
  const [donGia, setDonGia] = useState("")
  const [rows, setRows] = useState<Row[]>(emptyRows)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
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

  async function load() {
    const [customers, ingredients, vatTus, products] = await Promise.all([
      listCustomers(``, 1, 100),
      listIngredients(``, 1, 100),
      listVatTu(``, 1, 100),
      listProducts(filters.search, page, 10),
    ])
    setCustomers(customers.items as Customer[])
    setIngredients(ingredients.items as Ingredient[])
    setVatTus(vatTus.items as VatTu[])
    setProducts(products.items as unknown as Product[])
    setTotal(products.total)
  }

  function getRecipeRows(product: Product) {
    return recipeRows[product.mssp] ?? product.nguyenLieu.map((item) => ({
      nguyenLieuId: item.nguyenLieu.id,
      giaTri: item.giaTri,
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
      .map((row) => ({ nguyenLieuId: row.nguyenLieuId, giaTri: Number(row.giaTri) }))
    setSavingRecipeId(product.mssp)
    const result = await updateProductRecipe(product.mssp, recipe) as { error?: string }
    setSavingRecipeId(null)
    setMessage(result.error ?? `Đã cập nhật công thức`)
    if (!result.error) await load()
  }

  function getVatTuRows(product: Product) {
    return vatTuEditRows[product.mssp] ?? product.vatTu.map((item) => ({ ms: item.ms }))
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
      .then(async ([customers, ingredients, products, vatTus]) => {
        if (!active) return
        setCustomers(customers.items as Customer[])
        setIngredients(ingredients.items as Ingredient[])
        setVatTus(vatTus.items as VatTu[])
        setProducts(products.items as unknown as Product[])
        setTotal(products.total)
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

  function resetForm() {
    setEditingId(null)
    setMssp("")
    setMskh("")
    setTenThuongMai("")
    setTenPhanBon("")
    setQuyCach("")
    setQuyCachThung("")
    setDonGia("")
    setRows(emptyRows)
    setVatTuRows([])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ingredients = rows
      .filter((row) => row.nguyenLieuId && row.giaTri)
      .map((row) => ({ nguyenLieuId: row.nguyenLieuId, giaTri: Number(row.giaTri) }))
    if (ingredients.some((row) => !Number.isFinite(row.giaTri) || row.giaTri <= 0)) {
      setMessage(`Số lượng nguyên liệu phải lớn hơn 0`)
      return
    }
    const data = { mssp, mskh, tenThuongMai, tenPhanBon, quyCach, quyCachThung: Number(quyCachThung), donGia: Number(donGia), nguyenLieu: ingredients, vatTu: vatTuRows.map((row) => row.ms).filter(Boolean) }
    const result = (editingId ? await updateProduct(editingId, data) : await createProduct(data)) as { error?: string }
    setMessage(result.error ? result.error : (editingId ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm"))
    if (!result.error) {
      resetForm()
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

  function startEdit(product: Product) {
    setEditingId(product.mssp)
    setMssp(product.mssp)
    setMskh(product.mskh)
    setTenThuongMai(product.tenThuongMai)
    setTenPhanBon(product.tenPhanBon)
    setQuyCach(product.quyCach)
    setQuyCachThung(product.quyCachThung)
    setDonGia(product.donGia)
    setRows(product.nguyenLieu.length > 0
      ? product.nguyenLieu.map((item) => ({ nguyenLieuId: item.nguyenLieu.id, giaTri: item.giaTri }))
      : [{ nguyenLieuId: ``, giaTri: `` }])
    setVatTuRows(product.vatTu.map((item) => ({ ms: item.ms })))
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "mssp", label: "Mã sản phẩm" },
    { key: "mskh", label: "Mã khách hàng" },
    { key: "tenThuongMai", label: "Tên thương mại" },
    { key: "tenPhanBon", label: "Tên phân bón" },
    { key: "quyCach", label: "Quy cách" },
    { key: "quyCachThung", label: "Quy cách thùng" },
    { key: "donGia", label: "Đơn giá" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Sản phẩm</h1>
          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                           value={row.giaTri}
                           onChange={(event) => updateRow(index, "giaTri", event.target.value)}
                           placeholder="Định lượng"
                           required
                           className="rounded-lg border border-zinc-300 px-3 py-2"/>
                    <button type="button"
                            onClick={() => setRows((current) => current.length === 1
                              ? [{ nguyenLieuId: ``, giaTri: `` }]
                              : current.filter((_, rowIndex) => rowIndex !== index))}
                            className="rounded-lg border px-3 py-2">Xóa
                    </button>
                  </div>)}
              <button type="button"
                      onClick={() => setRows((current) => [...current, {nguyenLieuId: "", giaTri: ""}])}
                      className="rounded-lg border px-4 py-2">Thêm nguyên liệu
              </button>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <p className="text-sm font-medium text-zinc-700">Vật tư:</p>
              {vatTuRows.map((row, index) => <div key={index} className="flex gap-3">
                <select value={row.ms}
                        onChange={(event) => setVatTuRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ms: event.target.value } : item))}
                        className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">Chọn vật tư</option>
                  {vatTus.map((vatTu) => <option key={vatTu.ms} value={vatTu.ms}>{vatTu.ms} - {vatTu.ten}</option>)}
                </select>
                <button type="button" onClick={() => setVatTuRows((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border px-3 py-2">Xóa</button>
              </div>)}
              <button type="button" onClick={() => setVatTuRows((current) => [...current, { ms: ``, isNew: true }])} className="rounded-lg border px-4 py-2">Thêm vật tư</button>
            </div>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white lg:col-span-4">{editingId ? "Lưu thay đổi" : "Tạo sản phẩm"}</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách sản phẩm</h2>
            <input value={filters.search}
                   onChange={(event) => {
                     const search = event.target.value
                     setFilters({ search })
                     if (searchTimer.current) clearTimeout(searchTimer.current)
                     searchTimer.current = setTimeout(() => {
                       setPage(1)
                       void listProducts(search, 1, 10)
                         .then((result) => {
                           setProducts(result.items as unknown as Product[])
                           setTotal(result.total)
                         })
                     }, 500)
                   }}
                   placeholder="Tìm mã sản phẩm"
                   className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"/>
          </div>
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600"><tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 sm:px-6"><button type="button" onClick={() => toggleSort(column.key)} className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key)}</button></th>)}<th className="px-3 py-3 sm:px-6">Công thức</th><th className="px-3 py-3 sm:px-6">Thao tác</th></tr></thead>
            <tbody>{sortedProducts.map((product) => <Fragment key={product.mssp}>
              <tr className="border-t border-zinc-100">
                <td className="px-3 py-2 sm:px-6">{product.mssp}</td>
                <td className="px-3 py-2 sm:px-6">{product.mskh}</td>
                <td className="px-3 py-2 sm:px-6">{product.tenThuongMai}</td>
                <td className="px-3 py-2 sm:px-6">{product.tenPhanBon}</td>
                <td className="px-3 py-2 sm:px-6">{product.quyCach}</td>
                <td className="px-3 py-2 sm:px-6">{product.quyCachThung}</td>
                <td className="px-3 py-2 sm:px-6">{formatPrice(product.donGia)}</td>
                <td className="px-3 py-2 sm:px-6"><button type="button" onClick={() => setExpandedProductId(expandedProductId === product.mssp ? null : product.mssp)} className="text-blue-700 hover:underline">Xem công thức</button></td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => exportProductExcelFile(product.mssp)} className="text-green-700 hover:underline">Xuất Excel</button>
                    <button type="button" onClick={() => startEdit(product)} className="text-blue-700 hover:underline">Sửa</button>
                    <button type="button" onClick={() => void deleteProduct(product.mssp)} className="text-red-700 hover:underline">Xóa</button>
                  </div>
                </td>
              </tr>
              {expandedProductId === product.mssp && <tr className="bg-zinc-50">
                <td colSpan={9} className="px-3 py-3 sm:px-6">
                  <div className="mx-auto w-full max-w-xl overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-600"><tr><th className="px-2 py-1">Nguyên liệu</th><th className="px-2 py-1">Định lượng</th></tr></thead>
                      <tbody>
                        {getRecipeRows(product).map((row, index) => <tr key={`${product.mssp}-${index}`}>
                          <td className="px-2 py-1">
                            {row.isNew
                              ? <select value={row.nguyenLieuId}
                                        onChange={(event) => updateRecipeRow(product.mssp, index, `nguyenLieuId`, event.target.value)}
                                        className="w-full rounded border border-zinc-300 px-2 py-1">
                                  <option value="">Chọn nguyên liệu</option>
                                  {ingredients.map((item) => <option key={item.id} value={item.id}>{item.ten} - {item.loai} ({item.donVi})</option>)}
                                </select>
                              : <span>
                                  {product.nguyenLieu.find((item) => item.nguyenLieu.id === row.nguyenLieuId)?.nguyenLieu.ten
                                    ?? ingredients.find((item) => item.id === row.nguyenLieuId)?.ten
                                    ?? row.nguyenLieuId}
                                </span>}
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex gap-2">
                              <input type="number" min="0.001" step="0.001" value={row.giaTri}
                                     onChange={(event) => updateRecipeRow(product.mssp, index, `giaTri`, event.target.value)}
                                     className="w-28 rounded border border-zinc-300 px-2 py-1"/>
                              <button type="button" onClick={() => setRecipeRows((current) => ({
                                ...current,
                                [product.mssp]: getRecipeRows(product).filter((_, rowIndex) => rowIndex !== index),
                              }))} className="text-red-700 hover:underline">Xóa</button>
                            </div>
                          </td>
                        </tr>)}
                      </tbody>
                    </table>
                    <div className="mt-3 flex gap-3">
                      <button type="button" onClick={() => setRecipeRows((current) => ({
                        ...current,
                        [product.mssp]: [...getRecipeRows(product), { nguyenLieuId: ``, giaTri: ``, isNew: true }],
                      }))} className="rounded-lg border px-3 py-2">Thêm nguyên liệu</button>
                      <button type="button" disabled={savingRecipeId === product.mssp} onClick={() => void saveRecipe(product)} className="rounded-lg bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">Lưu công thức</button>
                    </div>
                    <div className="mt-4 border-t border-zinc-200 pt-3">
                      <p className="mb-2 font-medium">Vật tư</p>
                      {getVatTuRows(product).map((row, index) => <div key={`${product.mssp}-vat-tu-${index}`} className="mb-2 flex gap-2">
                        <select value={row.ms}
                                onChange={(event) => setVatTuEditRows((current) => ({
                                  ...current,
                                  [product.mssp]: getVatTuRows(product).map((item, itemIndex) => itemIndex === index ? { ...item, ms: event.target.value } : item),
                                }))}
                                className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1">
                          <option value="">Chọn vật tư</option>
                          {vatTus.map((vatTu) => <option key={vatTu.ms} value={vatTu.ms}>{vatTu.ms} - {vatTu.ten}</option>)}
                        </select>
                        <button type="button" onClick={() => setVatTuEditRows((current) => ({
                          ...current,
                          [product.mssp]: getVatTuRows(product).filter((_, itemIndex) => itemIndex !== index),
                        }))} className="text-red-700 hover:underline">Xóa</button>
                      </div>)}
                      <div className="mt-3 flex gap-3">
                        <button type="button" onClick={() => setVatTuEditRows((current) => ({
                          ...current,
                          [product.mssp]: [...getVatTuRows(product), { ms: ``, isNew: true }],
                        }))} className="rounded-lg border px-3 py-2">Thêm vật tư</button>
                        <button type="button" disabled={savingVatTuId === product.mssp} onClick={() => void saveVatTu(product)} className="rounded-lg bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">Lưu vật tư</button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>}
            </Fragment>)}</tbody>
          </table>
          <Pagination className="p-4"><PaginationContent><PaginationItem><PaginationPrevious text="Trước" href="#" onClick={(e) => { e.preventDefault(); const next=Math.max(1,page-1); setPage(next); void listProducts(filters.search,next,10).then((r)=>{setProducts(r.items as unknown as Product[]);setTotal(r.total)}) }} /></PaginationItem><PaginationItem><span className="px-3 text-sm">{page} / {pageCount}</span></PaginationItem><PaginationItem><PaginationNext text="Sau" href="#" onClick={(e) => { e.preventDefault(); const next=Math.min(pageCount,page+1); setPage(next); void listProducts(filters.search,next,10).then((r)=>{setProducts(r.items as unknown as Product[]);setTotal(r.total)}) }} /></PaginationItem></PaginationContent></Pagination>
        </section>
      </div>
    </main>
  )
}
