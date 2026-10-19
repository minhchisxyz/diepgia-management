"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { listIngredients, listIngredientPrices, createIngredient, updateIngredient, deleteIngredient as deleteIngredientAction, saveIngredientPrice, importIngredient as importIngredientAction } from "@/app/actions/nguyen-lieu/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import {formatDateTime, formatPrice} from "@/lib/utils"
import {CancelButton, DeleteButton, EditButton, ImportButton, SaveButton, SearchButton} from "@/components/buttons";

type Price = { id: string; ngay: string; donGia: string }
type Ingredient = { id: string; ten: string; donVi: string; loai: string; kho: number; donGia: string | null }
type SortKey = "ten" | "kho"

export default function NguyenLieuManager() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [ten, setTen] = useState("")
  const [donVi, setDonVi] = useState("")
  const [loai, setLoai] = useState("")
  const [kho, setKho] = useState("0")
  const [nhapHang, setNhapHang] = useState("")
  const [nhapHangId, setNhapHangId] = useState<string | null>(null)
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
    listIngredients("", 1, 10).then((result) => { if (active) { setItems(result.items as unknown as Ingredient[]); setTotal(result.total) } })      .catch(() => {
        if (active) setMessage("Không thể tải danh sách nguyên liệu")
      })
    return () => {
      active = false
    }
  }, [])

  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    let result: number
    if (sort.key === "kho") {
      result = a.kho - b.kho
    } else {
      result = String(a[sort.key]).localeCompare(String(b[sort.key]), "vi")
    }
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

  async function importIngredient(id: string, quantity: string) {
    const soLuong = Number(quantity)
    if (soLuong <= 0) {
      setMessage("Số lượng nhập phải lớn hơn 0")
      return
    }

    const result = await importIngredientAction(id, soLuong) as { error?: string }
    setMessage(result?.error ? result.error : "Đã nhập hàng")
    if (!result?.error) {
      setNhapHangId(null)
      setNhapHang("")
      await load()
    }
  }

  function startEdit(item: Ingredient) {
    setEditingId(item.id)
    setTen(item.ten)
    setDonVi(item.donVi)
    setLoai(item.loai)
    setKho(String(item.kho))
  }

  const columns: { key: SortKey | "donVi" | "loai"; label: string }[] = [
    { key: "ten", label: "Tên" },
    { key: "donVi", label: "Đơn vị" },
    { key: "loai", label: "Loại" },
    { key: "kho", label: "Kho" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Nguyên liệu</h1>
          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên nguyên liệu (*)
              <input value={ten} onChange={(event) => setTen(event.target.value)} placeholder="Nhập tên nguyên liệu" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Đơn vị (*)
              <input value={donVi} onChange={(event) => setDonVi(event.target.value)} placeholder="Nhập đơn vị" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Loại nguyên liệu (*)
              <input value={loai} onChange={(event) => setLoai(event.target.value)} placeholder="Nhập loại nguyên liệu" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <button className="h-10 self-end rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white">Tạo nguyên liệu</button>
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
            }} placeholder="Tìm theo tên nguyên liệu" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-xs" />
          </div>

          <table className="w-full text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-2 sm:px-6">
                    {column.key === "ten" || column.key === "kho" ? (
                      <button type="button" onClick={() => toggleSort(column.key as SortKey)} className="font-semibold hover:text-zinc-900">
                        {column.label}{sortLabel(column.key as SortKey)}
                      </button>
                    ) : (
                      <span className="font-semibold">{column.label}</span>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 sm:px-6">Đơn giá</th>
                <th className="px-3 py-2 sm:px-6">Nhập kho</th>
                <th className="px-3 py-2 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => editingId === item.id ? (
                <tr key={item.id} className="border-t border-zinc-100 bg-zinc-50">
                  <td className="px-3 py-2 sm:px-6">
                    <input value={ten} onChange={(event) => setTen(event.target.value)} className="w-full min-w-28 rounded border border-zinc-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input value={donVi} onChange={(event) => setDonVi(event.target.value)} className="w-full min-w-20 rounded border border-zinc-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input value={loai} onChange={(event) => setLoai(event.target.value)} className="w-full min-w-24 rounded border border-zinc-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <input type="number" min="0" value={kho} onChange={(event) => setKho(event.target.value)} className="w-full min-w-20 rounded border border-zinc-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2 text-zinc-400 sm:px-6">
                    {item.donGia === null ? "Chưa có giá" : formatPrice(item.donGia)}
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex gap-2">
                      <SaveButton onClick={() => void saveIngredient(item.id)} />
                      <CancelButton onClick={() => setEditingId(null)} />
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 sm:px-6">{item.ten}</td>
                  <td className="px-3 py-2 sm:px-6">{item.donVi}</td>
                  <td className="px-3 py-2 sm:px-6">{item.loai}</td>
                  <td className="px-3 py-2 sm:px-6">{item.kho}</td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex items-center gap-2">
                      <span>{item.donGia === null ? "Chưa có giá" : formatPrice(item.donGia)}</span>
                      <SearchButton onClick={() => {
                        const nextId = openPriceId === item.id ? null : item.id
                        setOpenPriceId(nextId)
                        if (nextId && !priceHistory[item.id]) void loadPriceHistory(item.id)
                      }}/>
                    </div>
                    {openPriceId === item.id && <div className="absolute mt-2 min-w-72 rounded-lg border border-zinc-200 bg-zinc-50 p-2 shadow-md z-20">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-16 z-10 bg-zinc-50">
                          <tr className="border-b border-zinc-200">
                            <th className="px-2 py-1">Ngày</th>
                            <th className="px-2 py-1">Đơn giá</th>
                          </tr>
                        </thead>
                        <tbody>
                        {(priceHistory[item.id] ?? []).map((entry) =>
                            <tr key={entry.id} className="border-b border-zinc-100 last:border-0">
                              <td className="px-2 py-1">{formatDateTime(new Date(entry.ngay)).slice(0, 10)}</td>
                              <td className="px-2 py-1">{formatPrice(entry.donGia)}</td>
                        </tr>)}
                        </tbody>
                      </table>
                      {(priceHistory[item.id] ?? []).length === 0 && <p className="px-2 py-1 text-xs text-zinc-500">Chưa có lịch sử đơn giá</p>}
                    </div>}
                    <div className="mt-1 flex gap-1">
                      <input type="number"
                             min="0"
                             step="0.001"
                             value={priceEditingId === item.id ? price : ""}
                             onChange={(event) => {
                               setPriceEditingId(item.id);
                               setPrice(event.target.value)
                             }}
                             placeholder="Giá mới"
                             className="w-24 rounded border border-zinc-300 px-1 py-1"/>
                      <SaveButton onClick={() => void savePrice(item.id)}/>
                    </div>
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className={`flex flex-row items-center justify-start`}>
                      <input type="number"
                             min="0"
                             step="1"
                             value={nhapHangId === item.id ? nhapHang : ""}
                             onChange={(event) => {
                               setNhapHangId(item.id)
                               setNhapHang(event.target.value)
                             }}
                             className="w-24 rounded border border-zinc-300 px-2 py-1"/>
                      <ImportButton onClick={() => void importIngredient(item.id, nhapHang)}/>
                    </div>
                  </td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex gap-2">
                      <EditButton onClick={() => startEdit(item)} />
                      <DeleteButton onClick={() => void deleteIngredient(item.id)} />
                    </div>
                  </td>
                </tr>
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
                    const next = Math.max(1, page - 1)
                    setPage(next)
                    void listIngredients(filter, next, 10).then((r) => {
                      setItems(r.items as unknown as Ingredient[])
                      setTotal(r.total)
                    })
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
                    e.preventDefault()
                    const next = Math.min(pageCount, page + 1)
                    setPage(next)
                    void listIngredients(filter, next, 10).then((r) => {
                      setItems(r.items as unknown as Ingredient[])
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
