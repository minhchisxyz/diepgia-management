"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type Customer = { mskh: string; ten: string }
type Ingredient = { id: string; ten: string; donVi: string; loai: string }
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
}
type Row = { nguyenLieuId: string; giaTri: string }
type SortKey = keyof Pick<Product, "mssp" | "tenThuongMai" | "tenPhanBon" | "quyCach" | "quyCachThung" | "donGia" | "mskh">

const emptyRows = [{ nguyenLieuId: "", giaTri: "" }]

export default function SanPhamManager() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
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
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "mssp", direction: "asc" })
  const [message, setMessage] = useState("")

  async function load() {
    const [customerResponse, ingredientResponse, productResponse] = await Promise.all([
      fetch("/api/khach-hang"),
      fetch("/api/nguyen-lieu"),
      fetch("/api/san-pham"),
    ])
    if (customerResponse.ok) setCustomers(await customerResponse.json() as Customer[])
    if (ingredientResponse.ok) setIngredients(await ingredientResponse.json() as Ingredient[])
    if (productResponse.ok) setProducts(await productResponse.json() as Product[])
  }

  useEffect(() => {
    let active = true
    Promise.all([fetch("/api/khach-hang"), fetch("/api/nguyen-lieu"), fetch("/api/san-pham")])
      .then(async ([customerResponse, ingredientResponse, productResponse]) => {
        if (!active) return
        if (customerResponse.ok) setCustomers(await customerResponse.json() as Customer[])
        if (ingredientResponse.ok) setIngredients(await ingredientResponse.json() as Ingredient[])
        if (productResponse.ok) setProducts(await productResponse.json() as Product[])
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
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(editingId ? `/api/san-pham/${encodeURIComponent(editingId)}` : "/api/san-pham", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mssp, mskh, tenThuongMai, tenPhanBon, quyCach, quyCachThung, donGia: Number(donGia), nguyenLieu: rows.map((row) => ({ nguyenLieuId: row.nguyenLieuId, giaTri: Number(row.giaTri) })) }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? (editingId ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm") : result.error ?? (editingId ? "Không thể cập nhật sản phẩm" : "Không thể tạo sản phẩm"))
    if (response.ok) {
      resetForm()
      await load()
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return
    const response = await fetch(`/api/san-pham/${encodeURIComponent(id)}`, { method: "DELETE" })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã xóa sản phẩm" : result.error ?? "Không thể xóa sản phẩm")
    if (response.ok) await load()
  }

  function startEdit(product: Product) {
    setEditingId(product.mssp)
    setMskh(product.mskh)
    setTenThuongMai(product.tenThuongMai)
    setTenPhanBon(product.tenPhanBon)
    setQuyCach(product.quyCach)
    setQuyCachThung(product.quyCachThung)
    setDonGia(product.donGia)
    setRows(product.nguyenLieu.map((item) => ({ nguyenLieuId: item.nguyenLieu.id, giaTri: item.giaTri })))
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "mssp", label: "Mã sản phẩm" },
    { key: "tenThuongMai", label: "Tên thương mại" },
    { key: "tenPhanBon", label: "Tên phân bón" },
    { key: "quyCach", label: "Quy cách" },
    { key: "quyCachThung", label: "Quy cách thùng" },
    { key: "donGia", label: "Đơn giá" },
    { key: "mskh", label: "Mã khách hàng" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Sản phẩm</h1>
          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã sản phẩm (*)
              <input value={mssp} onChange={(event) => setMssp(event.target.value)} placeholder="Nhập mã sản phẩm" required disabled={editingId !== null} className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Khách hàng (*)
              <select value={mskh} onChange={(event) => setMskh(event.target.value)} required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"><option value="">Chọn khách hàng</option>{customers.map((customer) => <option key={customer.mskh} value={customer.mskh}>{customer.mskh} - {customer.ten}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên thương mại (*)
              <input value={tenThuongMai} onChange={(event) => setTenThuongMai(event.target.value)} placeholder="Nhập tên thương mại" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên phân bón (*)
              <input value={tenPhanBon} onChange={(event) => setTenPhanBon(event.target.value)} placeholder="Nhập tên phân bón" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Quy cách (*)
              <input value={quyCach} onChange={(event) => setQuyCach(event.target.value)} placeholder="Nhập quy cách" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Quy cách thùng (*)
              <input value={quyCachThung} onChange={(event) => setQuyCachThung(event.target.value)} placeholder="Nhập quy cách thùng" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Đơn giá (*)
              <input type="number" min="0" step="0.001" value={donGia} onChange={(event) => setDonGia(event.target.value)} placeholder="Nhập đơn giá" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <p className="text-sm font-medium text-zinc-700">Nguyên liệu (*):</p>
              {rows.map((row, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                <select value={row.nguyenLieuId} onChange={(event) => updateRow(index, "nguyenLieuId", event.target.value)} required className="rounded-lg border border-zinc-300 px-3 py-2"><option value="">Chọn nguyên liệu</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.ten} - {item.loai} ({item.donVi})</option>)}</select>
                <input type="number" min="0.001" step="0.001" value={row.giaTri} onChange={(event) => updateRow(index, "giaTri", event.target.value)} placeholder="Định lượng" required className="rounded-lg border border-zinc-300 px-3 py-2" />
                <button type="button" onClick={() => setRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg border px-3 py-2">Xóa</button>
              </div>)}
              <button type="button" onClick={() => setRows((current) => [...current, { nguyenLieuId: "", giaTri: "" }])} className="rounded-lg border px-4 py-2">Thêm nguyên liệu</button>
            </div>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white lg:col-span-4">{editingId ? "Lưu thay đổi" : "Tạo sản phẩm"}</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <h2 className="p-5 text-xl font-semibold text-zinc-900 sm:p-6">Danh sách sản phẩm</h2>
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600"><tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 sm:px-6"><button type="button" onClick={() => toggleSort(column.key)} className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key)}</button></th>)}<th className="px-3 py-3 sm:px-6">Thao tác</th></tr></thead>
            <tbody>{sortedProducts.map((product) => <tr key={product.mssp} className="border-t border-zinc-100">
              <td className="px-3 py-2 sm:px-6">{product.mssp}</td>
              <td className="px-3 py-2 sm:px-6">{product.tenThuongMai}</td>
              <td className="px-3 py-2 sm:px-6">{product.tenPhanBon}</td>
              <td className="px-3 py-2 sm:px-6">{product.quyCach}</td>
              <td className="px-3 py-2 sm:px-6">{product.quyCachThung}</td>
              <td className="px-3 py-2 sm:px-6">{product.donGia}</td>
              <td className="px-3 py-2 sm:px-6">{product.mskh}</td>
              <td className="px-3 py-2 sm:px-6"><div className="flex gap-3"><button type="button" onClick={() => startEdit(product)} className="text-blue-700 hover:underline">Sửa</button><button type="button" onClick={() => void deleteProduct(product.mssp)} className="text-red-700 hover:underline">Xóa</button></div></td>
            </tr>)}</tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
