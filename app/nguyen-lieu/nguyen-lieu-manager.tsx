"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import {Search} from "lucide-react";

type Price = { id: string; ngay: string; donGia: string }
type Ingredient = { id: string; ten: string; donVi: string; loai: string; donGia: string | null }
type SortKey = keyof Ingredient

export default function NguyenLieuManager() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [ten, setTen] = useState("")
  const [donVi, setDonVi] = useState("")
  const [loai, setLoai] = useState("")
  const [priceDate, setPriceDate] = useState(new Date().toISOString().slice(0, 10))
  const [price, setPrice] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [priceEditingId, setPriceEditingId] = useState<string | null>(null)
  const [openPriceId, setOpenPriceId] = useState<string | null>(null)
  const [priceHistory, setPriceHistory] = useState<Record<string, Price[]>>({})
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "ten", direction: "asc" })
  const [message, setMessage] = useState("")

  async function load() {
    const response = await fetch("/api/nguyen-lieu")
    if (response.ok) setItems(await response.json() as Ingredient[])
  }

  useEffect(() => {
    let active = true
    fetch("/api/nguyen-lieu")
      .then(async (response) => {
        if (response.ok && active) setItems(await response.json() as Ingredient[])
      })
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
    const response = await fetch("/api/nguyen-lieu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ten, donVi, loai }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã tạo nguyên liệu" : result.error ?? "Không thể tạo nguyên liệu")
    if (response.ok) {
      setTen("")
      setDonVi("")
      setLoai("")
      await load()
    }
  }

  async function saveIngredient(id: string) {
    const response = await fetch(`/api/nguyen-lieu/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ten, donVi, loai }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã cập nhật nguyên liệu" : result.error ?? "Không thể cập nhật nguyên liệu")
    if (response.ok) {
      setEditingId(null)
      await load()
    }
  }

  async function deleteIngredient(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa nguyên liệu này?")) return
    const response = await fetch(`/api/nguyen-lieu/${encodeURIComponent(id)}`, { method: "DELETE" })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã xóa nguyên liệu" : result.error ?? "Không thể xóa nguyên liệu")
    if (response.ok) await load()
  }

  async function savePrice(id: string) {
    const response = await fetch(`/api/nguyen-lieu/${encodeURIComponent(id)}/gia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ngay: priceDate, donGia: Number(price) }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã cập nhật đơn giá" : result.error ?? "Không thể cập nhật đơn giá")
    if (response.ok) {
      setPriceEditingId(null)
      await load()
      await loadPriceHistory(id)
    }
  }

  async function loadPriceHistory(id: string) {
    const response = await fetch(`/api/nguyen-lieu/${encodeURIComponent(id)}/gia`)
    if (response.ok) {
      const prices = await response.json() as Price[]
      setPriceHistory((current) => ({ ...current, [id]: prices }))
    }
  }

  async function deletePrice(id: string, date: string) {
    if (!window.confirm("Bạn có chắc muốn xóa đơn giá của ngày này?")) return
    const response = await fetch(`/api/nguyen-lieu/${encodeURIComponent(id)}/gia?date=${date}`, { method: "DELETE" })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã xóa đơn giá" : result.error ?? "Không thể xóa đơn giá")
    if (response.ok) {
      await load()
      await loadPriceHistory(id)
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    //{ key: "id", label: "ID" },
    { key: "ten", label: "Tên" },
    { key: "donVi", label: "Đơn vị" },
    { key: "loai", label: "Loại" },
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
          <h2 className="p-5 text-xl font-semibold text-zinc-900 sm:p-6">Danh sách nguyên liệu</h2>
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
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
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span>{item.donGia ?? "Chưa có giá"}</span>
                    <button type="button" aria-label="Xem lịch sử đơn giá" onClick={() => {
                      const nextId = openPriceId === item.id ? null : item.id
                      setOpenPriceId(nextId)
                      if (nextId && !priceHistory[item.id]) void loadPriceHistory(item.id)
                    }} className="text-blue-700 hover:text-blue-900"><Search/></button>
                  </div>
                  {openPriceId === item.id && <div className="absolute mt-2 min-w-72 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200">
                          <th className="px-2 py-1">Ngày</th>
                          <th className="px-2 py-1">Đơn giá</th>
                          <th className="px-2 py-1">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                      {(priceHistory[item.id] ?? []).map((entry) => <tr key={entry.id} className="border-b border-zinc-100 last:border-0">
                        <td className="px-2 py-1">{entry.ngay.slice(0, 10)}</td>
                        <td className="px-2 py-1">
                          <input type="number"
                                 min="0"
                                 step="0.001"
                                 value={priceEditingId === entry.id ? price : entry.donGia}
                                 onChange={(event) => {
                                   setPriceEditingId(entry.id);
                                   setPriceDate(entry.ngay.slice(0, 10));
                                   setPrice(event.target.value)
                                 }}
                                 className="w-24 rounded border border-zinc-300 px-1 py-1"/>
                        </td>
                        <td className="px-2 py-1"><div className="flex gap-2">
                          <button type="button"
                                  onClick={() => void savePrice(item.id)}
                                  className="text-green-700 hover:underline">Lưu
                          </button>
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
        </section>
      </div>
    </main>
  )
}
