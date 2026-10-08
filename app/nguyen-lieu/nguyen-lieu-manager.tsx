"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type Ingredient = { id: string; ten: string; donVi: string }
type SortKey = keyof Ingredient

export default function NguyenLieuManager() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [ten, setTen] = useState("")
  const [donVi, setDonVi] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
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
      body: JSON.stringify({ ten, donVi }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã tạo nguyên liệu" : result.error ?? "Không thể tạo nguyên liệu")
    if (response.ok) {
      setTen("")
      setDonVi("")
      await load()
    }
  }

  async function saveIngredient(id: string) {
    const response = await fetch(`/api/nguyen-lieu/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ten, donVi }),
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

  const columns: { key: SortKey; label: string }[] = [
    { key: "id", label: "ID" },
    { key: "ten", label: "Tên" },
    { key: "donVi", label: "Đơn vị" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Nguyên liệu</h1>
          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input value={ten} onChange={(event) => setTen(event.target.value)} placeholder="Tên nguyên liệu" required className="rounded-lg border border-zinc-300 px-3 py-2" />
            <input value={donVi} onChange={(event) => setDonVi(event.target.value)} placeholder="Đơn vị" required className="rounded-lg border border-zinc-300 px-3 py-2" />
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white sm:col-span-2">Tạo nguyên liệu</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <h2 className="p-5 text-xl font-semibold">Danh sách nguyên liệu</h2>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-zinc-100"><tr>{columns.map((column) => <th key={column.key} className="px-5 py-3"><button type="button" onClick={() => toggleSort(column.key)} className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key)}</button></th>)}<th className="px-5 py-3">Thao tác</th></tr></thead>
            <tbody>{sortedItems.map((item) => editingId === item.id ? (
              <tr key={item.id} className="border-t">
                <td className="px-5 py-3">{item.id}</td>
                <td className="px-5 py-3"><input value={ten} onChange={(event) => setTen(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                <td className="px-5 py-3"><input value={donVi} onChange={(event) => setDonVi(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                <td className="px-5 py-3"><div className="flex gap-2"><button type="button" onClick={() => void saveIngredient(item.id)} className="text-green-700 hover:underline">Lưu</button><button type="button" onClick={() => setEditingId(null)} className="text-zinc-600 hover:underline">Hủy</button></div></td>
              </tr>
            ) : (
              <tr key={item.id} className="border-t"><td className="px-5 py-4">{item.id}</td><td className="px-5 py-4">{item.ten}</td><td className="px-5 py-4">{item.donVi}</td><td className="px-5 py-4"><div className="flex gap-3"><button type="button" onClick={() => { setEditingId(item.id); setTen(item.ten); setDonVi(item.donVi) }} className="text-blue-700 hover:underline">Sửa</button><button type="button" onClick={() => void deleteIngredient(item.id)} className="text-red-700 hover:underline">Xóa</button></div></td></tr>
            ))}</tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
