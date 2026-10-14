"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {Search} from "lucide-react";
import { listIngredients, listIngredientPrices, createIngredient, updateIngredient, deleteIngredient as deleteIngredientAction, saveIngredientPrice, deleteIngredientPrice } from "@/app/actions/nguyen-lieu/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { formatPrice } from "@/lib/utils"

type Price = { id: string; ngay: string; donGia: string }
type Ingredient = { id: string; ten: string; donVi: string; loai: string; kho: number; donGia: string | null }
type SortKey = keyof Ingredient

export default function NguyenLieuManager() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [ten, setTen] = useState("")
  const [donVi, setDonVi] = useState("")
  const [loai, setLoai] = useState("")
  const [kho, setKho] = useState("0")
  const [priceDate] = useState(new Date().toISOString().slice(0, 10))
  const [price, setPrice] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [priceEditingId, setPriceEditingId] = useState<string | null>(null)
  const [openPriceId, setOpenPriceId] = useState<string | null>(null)
  const [priceHistory, setPriceHistory] = useState<Record<string, Price[]>>({})
  const [filter, setFilter] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "ten", direction: "asc" })
  const [message, setMessage] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    const result = await listIngredients(filter, page, 10)
    setItems(result.items as unknown as Ingredient[]); setTotal(result.total)
  }

  useEffect(() => {
    let active = true
    listIngredients("", 1, 10).then((result) => { if (active) { setItems(result.items as unknown as Ingredient[]); setTotal(result.total) } })
      .catch(() => {
        if (active) setMessage("Không thể tải danh sách nguyên liệu")
      })
    return () => {
      active = false
    }
  }, [])

  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    const result = String(a[sort.key]).localeCompare(String(b[sort.key]), "vi")
    return sort.direction === "asc" ? result : -result
  }), [items, sort])
  const pageCount = Math.max(1, Math.ceil(total / 10))

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
    const result = await createIngredient({ ten, donVi, loai }) as { error?: string }
    setMessage(result.error ? result.error : "Đã tạo nguyên liệu")
    if (!result.error) {
      setTen("")
      setDonVi("")
      setLoai("")
      setKho("0")
      await load()
    }
  }

  async function saveIngredient(id: string) {
    const result = await updateIngredient(id, { ten, donVi, loai, kho: Number(kho) }) as { error?: string }
    setMessage(result.error ? result.error : "Đã cập nhật nguyên liệu")
    if (!result.error) {
      setEditingId(null)
      await load()
    }
  }

  async function deleteIngredient(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa nguyên liệu này?")) return
    const result = await deleteIngredientAction(id) as { error?: string }
    setMessage(result.error ? result.error : "Đã xóa nguyên liệu")
    if (!result.error) await load()
  }

  async function savePrice(id: string) {
    const result = await saveIngredientPrice(id,priceDate,Number(price)) as { error?: string }
    setMessage(result.error ? result.error : "Đã cập nhật đơn giá")
    if (!result.error) {
      setPriceEditingId(null)
      await load()
      await loadPriceHistory(id)
    }
  }

  async function loadPriceHistory(id: string) {
    const prices = await listIngredientPrices(id)
    setPriceHistory((current) => ({ ...current, [id]: prices as unknown as Price[] }))
  }

  async function deletePrice(id: string, date: string) {
    if (!window.confirm("Bạn có chắc muốn xóa đơn giá của ngày này?")) return
    const result = await deleteIngredientPrice(id,date) as { error?: string }
    setMessage(result.error ? result.error : "Đã xóa đơn giá")
    if (!result.error) {
      await load()
      await loadPriceHistory(id)
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    //{ key: "id", label: "ID" },
    { key: "ten", label: "Tên" },
    { key: "donVi", label: "Đơn vị" },
    { key: "loai", label: "Loại" },
    { key: "kho", label: "Kho" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Nguyên liệu</h1>
          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên nguyên liệu (*)
              <input value={ten} onChange={(event) => setTen(event.target.value)} placeholder="Nhập tên nguyên liệu" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Đơn vị (*)
              <input value={donVi} onChange={(event) => setDonVi(event.target.value)} placeholder="Nhập đơn vị" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Loại (*)
              <input value={loai} onChange={(event) => setLoai(event.target.value)} placeholder="Nhập loại" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white sm:col-span-2">Tạo nguyên liệu</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách nguyên liệu</h2>
            <input value={filter} onChange={(event) => {
              const value = event.target.value
              setFilter(value)
              if (searchTimer.current) clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => {
                setPage(1)
                void listIngredients(value, 1, 10).then((result) => {
                  setItems(result.items as unknown as Ingredient[])
                  setTotal(result.total)
                })
              }, 500)
            }} placeholder="Tìm tên nguyên liệu" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md" />
          </div>
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>{columns.map((column) =>
                  <th key={column.key} className="px-3 py-2 sm:px-6">
                    <button type="button" onClick={() => toggleSort(column.key)} className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key)}
                    </button>
                  </th>)}
                <th className="px-3 py-3 sm:px-6">Đơn giá hôm nay</th>
                <th className="px-3 py-3 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>{sortedItems.map((item) => editingId === item.id ? (
              <tr key={item.id} className="border-t border-zinc-100">
                {/*<td className="px-5 py-3">{item.id}</td>*/}
                <td className="px-3 py-2 sm:px-6"><input value={ten} onChange={(event) => setTen(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                <td className="px-3 py-2 sm:px-6"><input value={donVi} onChange={(event) => setDonVi(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                <td className="px-3 py-2 sm:px-6"><input value={loai} onChange={(event) => setLoai(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                <td className="px-3 py-2 sm:px-6"><input type="number" min="0" step="1" value={kho} onChange={(event) => setKho(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                <td className="px-3 py-2 sm:px-6">—</td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void saveIngredient(item.id)} className="text-green-700 hover:underline">
                      Lưu</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-zinc-600 hover:underline">
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={item.id} className="border-t border-zinc-100">
                {/*<td className="px-5 py-4">{item.id}</td>*/}
                <td className="px-3 py-2 sm:px-6">{item.ten}</td>
                <td className="px-3 py-2 sm:px-6">{item.donVi}</td>
                <td className="px-3 py-2 sm:px-6">{item.loai}</td>
                <td className="px-3 py-2 sm:px-6">{item.kho}</td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span>{item.donGia === null ? "Chưa có giá" : formatPrice(item.donGia)}</span>
                    <button type="button" aria-label="Xem lịch sử đơn giá" onClick={() => {
                      const nextId = openPriceId === item.id ? null : item.id
                      setOpenPriceId(nextId)
                      if (nextId && !priceHistory[item.id]) void loadPriceHistory(item.id)
                    }} className="text-blue-700 hover:text-blue-900"><Search/></button>
                  </div>
                  {openPriceId === item.id && <div className="absolute mt-2 min-w-72 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-16 z-10 bg-zinc-50">
                        <tr className="border-b border-zinc-200">
                          <th className="px-2 py-1">Ngày</th>
                          <th className="px-2 py-1">Đơn giá</th>
                          <th className="px-2 py-1">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                      {(priceHistory[item.id] ?? []).map((entry) => <tr key={entry.id} className="border-b border-zinc-100 last:border-0">
                        <td className="px-2 py-1">{entry.ngay.slice(0, 10)}</td>
                        <td className="px-2 py-1">{formatPrice(entry.donGia)}</td>
                        <td className="px-2 py-1"><div className="flex gap-2">
                          <button type="button"
                                  onClick={() => void deletePrice(item.id, entry.ngay.slice(0, 10))}
                                  className="text-red-700 hover:underline">Xóa
                          </button>
                        </div>
                        </td>
                      </tr>)}
                      </tbody>
                    </table>
                    {(priceHistory[item.id] ?? []).length === 0 && <p className="px-2 py-1 text-xs text-zinc-500">Chưa có lịch sử đơn giá</p>}
                  </div>}
                  <div className="mt-1 flex gap-1">
                    <input type="number" min="0" step="0.001" value={priceEditingId === item.id ? price : ""} onChange={(event) => { setPriceEditingId(item.id); setPrice(event.target.value) }} placeholder="Giá mới" className="w-24 rounded border border-zinc-300 px-1 py-1" />
                    <button type="button" onClick={() => void savePrice(item.id)} className="text-green-700 hover:underline">Lưu</button>
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex gap-3">
                    <button type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setTen(item.ten);
                              setDonVi(item.donVi);
                              setLoai(item.loai)
                              setKho(String(item.kho))
                            }}
                            className="text-blue-700 hover:underline">Sửa
                    </button>
                    <button type="button"
                            onClick={() => void deleteIngredient(item.id)}
                            className="text-red-700 hover:underline">Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
          <Pagination className="p-4"><PaginationContent><PaginationItem><PaginationPrevious text="Trước" href="#" onClick={(e) => { e.preventDefault(); const next=Math.max(1,page-1); setPage(next); void listIngredients(filter,next,10).then((r)=>{setItems(r.items as unknown as Ingredient[]);setTotal(r.total)}) }} /></PaginationItem><PaginationItem><span className="px-3 text-sm">{page} / {pageCount}</span></PaginationItem><PaginationItem><PaginationNext text="Sau" href="#" onClick={(e) => { e.preventDefault(); const next=Math.min(pageCount,page+1); setPage(next); void listIngredients(filter,next,10).then((r)=>{setItems(r.items as unknown as Ingredient[]);setTotal(r.total)}) }} /></PaginationItem></PaginationContent></Pagination>
        </section>
      </div>
    </main>
  )
}
