"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type Customer = { mskh: string; ten: string }
type Recipe = { id: string; nguyenLieu: { nguyenLieu: { ten: string }; giaTri: string }[] }
type Product = { mssp: string; khachHang: Customer; congThuc: Recipe }
type SortKey = "mssp" | "khachHang" | "congThuc"

export default function SanPhamManager() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [mssp, setMssp] = useState("")
  const [mskh, setMskh] = useState("")
  const [congThucId, setCongThucId] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "mssp", direction: "asc" })
  const [message, setMessage] = useState("")

  async function load() {
    const [customerResponse, recipeResponse, productResponse] = await Promise.all([fetch("/api/khach-hang"), fetch("/api/cong-thuc"), fetch("/api/san-pham")])
    if (customerResponse.ok) setCustomers(await customerResponse.json() as Customer[])
    if (recipeResponse.ok) setRecipes(await recipeResponse.json() as Recipe[])
    if (productResponse.ok) setProducts(await productResponse.json() as Product[])
  }

  useEffect(() => {
    let active = true
    Promise.all([fetch("/api/khach-hang"), fetch("/api/cong-thuc"), fetch("/api/san-pham")])
      .then(async ([customerResponse, recipeResponse, productResponse]) => {
        if (!active) return
        if (customerResponse.ok) setCustomers(await customerResponse.json() as Customer[])
        if (recipeResponse.ok) setRecipes(await recipeResponse.json() as Recipe[])
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
    const left = sort.key === "mssp" ? a.mssp : sort.key === "khachHang" ? `${a.khachHang.mskh} ${a.khachHang.ten}` : a.congThuc.id
    const right = sort.key === "mssp" ? b.mssp : sort.key === "khachHang" ? `${b.khachHang.mskh} ${b.khachHang.ten}` : b.congThuc.id
    const result = left.localeCompare(right, "vi")
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch("/api/san-pham", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mssp, mskh, congThucId }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã tạo sản phẩm" : result.error ?? "Không thể tạo sản phẩm")
    if (response.ok) {
      setMssp("")
      setMskh("")
      setCongThucId("")
      await load()
    }
  }

  async function saveProduct(id: string) {
    const response = await fetch(`/api/san-pham/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mskh, congThucId }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã cập nhật sản phẩm" : result.error ?? "Không thể cập nhật sản phẩm")
    if (response.ok) {
      setEditingId(null)
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

  const columns: { key: SortKey; label: string }[] = [
    { key: "mssp", label: "Mã sản phẩm" },
    { key: "khachHang", label: "Khách hàng" },
    { key: "congThuc", label: "Công thức" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">Sản phẩm</h1>
          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-3">
            <input value={mssp} onChange={(event) => setMssp(event.target.value)} placeholder="Mã sản phẩm" required className="rounded-lg border border-zinc-300 px-3 py-2" />
            <select value={mskh} onChange={(event) => setMskh(event.target.value)} required className="rounded-lg border border-zinc-300 px-3 py-2"><option value="">Chọn khách hàng</option>{customers.map((customer) => <option key={customer.mskh} value={customer.mskh}>{customer.mskh} - {customer.ten}</option>)}</select>
            <select value={congThucId} onChange={(event) => setCongThucId(event.target.value)} required className="rounded-lg border border-zinc-300 px-3 py-2"><option value="">Chọn công thức</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.id}</option>)}</select>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white sm:col-span-3">Tạo sản phẩm</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <h2 className="p-5 text-xl font-semibold">Danh sách sản phẩm</h2>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-100"><tr>{columns.map((column) => <th key={column.key} className="px-5 py-3"><button type="button" onClick={() => toggleSort(column.key)} className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key)}</button></th>)}<th className="px-5 py-3">Thao tác</th></tr></thead>
            <tbody>{sortedProducts.map((product) => editingId === product.mssp ? (
              <tr key={product.mssp} className="border-t">
                <td className="px-5 py-3">{product.mssp}</td>
                <td className="px-5 py-3"><select value={mskh} onChange={(event) => setMskh(event.target.value)} className="rounded border border-zinc-300 px-2 py-1">{customers.map((customer) => <option key={customer.mskh} value={customer.mskh}>{customer.mskh} - {customer.ten}</option>)}</select></td>
                <td className="px-5 py-3"><select value={congThucId} onChange={(event) => setCongThucId(event.target.value)} className="rounded border border-zinc-300 px-2 py-1">{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.id}</option>)}</select></td>
                <td className="px-5 py-3"><div className="flex gap-2"><button type="button" onClick={() => void saveProduct(product.mssp)} className="text-green-700 hover:underline">Lưu</button><button type="button" onClick={() => setEditingId(null)} className="text-zinc-600 hover:underline">Hủy</button></div></td>
              </tr>
            ) : (
              <tr key={product.mssp} className="border-t"><td className="px-5 py-4">{product.mssp}</td><td className="px-5 py-4">{product.khachHang.mskh} - {product.khachHang.ten}</td><td className="px-5 py-4">{product.congThuc.id}</td><td className="px-5 py-4"><div className="flex gap-3"><button type="button" onClick={() => { setEditingId(product.mssp); setMskh(product.khachHang.mskh); setCongThucId(product.congThuc.id) }} className="text-blue-700 hover:underline">Sửa</button><button type="button" onClick={() => void deleteProduct(product.mssp)} className="text-red-700 hover:underline">Xóa</button></div></td></tr>
            ))}</tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
