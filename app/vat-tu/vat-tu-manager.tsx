"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { getLoaiVatTuLabel, loaiVatTuLabels } from "@/lib/loai-vat-tu"

type KhachHang = { mskh: string }
type VatTu = {
  ms: string
  ten: keyof typeof loaiVatTuLabels
  loai: string
  mskh: string
}
type SortKey = keyof VatTu

export default function VatTuManager() {
  const [vatTus, setVatTus] = useState<VatTu[]>([])
  const [khachHangs, setKhachHangs] = useState<KhachHang[]>([])
  const [customerFilter, setCustomerFilter] = useState("")
  const [ms, setMs] = useState("")
  const [ten, setTen] = useState<VatTu["ten"]>("THUNG")
  const [loai, setLoai] = useState("")
  const [mskh, setMskh] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "ms", direction: "asc" })
  const [message, setMessage] = useState("")

  async function loadVatTus(filter = customerFilter) {
    const response = await fetch(`/api/vat-tu${filter ? `?mskh=${encodeURIComponent(filter)}` : ""}`)
    if (response.ok) setVatTus(await response.json() as VatTu[])
  }

  useEffect(() => {
    let active = true
    Promise.all([fetch("/api/vat-tu"), fetch("/api/khach-hang")])
      .then(async ([vatTuResponse, khachHangResponse]) => {
        if (!active) return
        if (vatTuResponse.ok) setVatTus(await vatTuResponse.json() as VatTu[])
        if (khachHangResponse.ok) setKhachHangs(await khachHangResponse.json() as KhachHang[])
      })
      .catch(() => {
        if (active) setMessage("Không thể tải dữ liệu")
      })
    return () => {
      active = false
    }
  }, [])

  const sortedVatTus = useMemo(() => [...vatTus].sort((a, b) => {
    const result = String(a[sort.key]).localeCompare(String(b[sort.key]), "vi")
    return sort.direction === "asc" ? result : -result
  }), [vatTus, sort])

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" })
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕"
  }

  async function createVatTu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    const response = await fetch("/api/vat-tu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ms, ten, loai, mskh }),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) {
      setMessage(result.error ?? "Không thể tạo vật tư")
      return
    }
    setMs("")
    setLoai("")
    setMskh("")
    setMessage("Đã tạo vật tư")
    await loadVatTus()
  }

  async function filterVatTus(value: string) {
    setCustomerFilter(value)
    const [vatTuResponse, khachHangResponse] = await Promise.all([
      fetch(`/api/vat-tu${value ? `?mskh=${encodeURIComponent(value)}` : ""}`),
      fetch(`/api/khach-hang${value ? `?search=${encodeURIComponent(value)}` : ""}`),
    ])
    if (vatTuResponse.ok) setVatTus(await vatTuResponse.json() as VatTu[])
    if (khachHangResponse.ok) setKhachHangs(await khachHangResponse.json() as KhachHang[])
  }

  async function saveVatTu(id: string) {
    const response = await fetch(`/api/vat-tu/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ten, loai, mskh }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã cập nhật vật tư" : result.error ?? "Không thể cập nhật vật tư")
    if (response.ok) {
      setEditingId(null)
      await loadVatTus()
    }
  }

  async function deleteVatTu(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa vật tư này?")) return
    const response = await fetch(`/api/vat-tu/${encodeURIComponent(id)}`, { method: "DELETE" })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã xóa vật tư" : result.error ?? "Không thể xóa vật tư")
    if (response.ok) await loadVatTus()
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "ms", label: "Mã vật tư" },
    { key: "ten", label: "Tên" },
    { key: "loai", label: "Loại" },
    { key: "mskh", label: "Mã khách hàng" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Vật tư</h1>
          <form onSubmit={createVatTu} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã vật tư (*)
              <input value={ms} onChange={(event) => setMs(event.target.value)} placeholder="Nhập mã vật tư" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên (*)
              <select value={ten} onChange={(event) => setTen(event.target.value as VatTu["ten"])} className="rounded-lg border border-zinc-300 px-3 py-2 font-normal">{Object.keys(loaiVatTuLabels).map((value) => <option key={value} value={value}>{getLoaiVatTuLabel(value as VatTu["ten"])}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Loại (*)
              <input value={loai} onChange={(event) => setLoai(event.target.value)} placeholder="Nhập loại" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã khách hàng (*)
              <select value={mskh} onChange={(event) => setMskh(event.target.value)} required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"><option value="">Chọn mã khách hàng</option>{khachHangs.map((khachHang) => <option key={khachHang.mskh} value={khachHang.mskh}>{khachHang.mskh}</option>)}</select>
            </label>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 sm:col-span-2 lg:col-span-4">Tạo vật tư</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><h2 className="text-xl font-semibold text-zinc-900">Danh sách vật tư</h2><input value={customerFilter} onChange={(event) => { void filterVatTus(event.target.value) }} placeholder="Lọc theo mã khách hàng" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></div>
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600"><tr>{columns.map((column) => <th key={column.key} className="px-5 py-3 sm:px-6"><button type="button" onClick={() => toggleSort(column.key)} className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key)}</button></th>)}<th className="px-5 py-3 sm:px-6">Thao tác</th></tr></thead>
            <tbody>{sortedVatTus.map((vatTu) => editingId === vatTu.ms ? (
              <tr key={vatTu.ms} className="border-t border-zinc-100">
                <td className="px-5 py-3 sm:px-6">{vatTu.ms}</td>
                <td className="px-5 py-3 sm:px-6"><select value={ten} onChange={(event) => setTen(event.target.value as VatTu["ten"])} className="rounded border border-zinc-300 px-2 py-1">{Object.keys(loaiVatTuLabels).map((value) => <option key={value} value={value}>{getLoaiVatTuLabel(value as VatTu["ten"])}</option>)}</select></td>
                <td className="px-5 py-3 sm:px-6"><input value={loai} onChange={(event) => setLoai(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                <td className="px-5 py-3 sm:px-6"><select value={mskh} onChange={(event) => setMskh(event.target.value)} className="rounded border border-zinc-300 px-2 py-1">{khachHangs.map((customer) => <option key={customer.mskh} value={customer.mskh}>{customer.mskh}</option>)}</select></td>
                <td className="px-5 py-3 sm:px-6"><div className="flex gap-2"><button type="button" onClick={() => void saveVatTu(vatTu.ms)} className="text-green-700 hover:underline">Lưu</button><button type="button" onClick={() => setEditingId(null)} className="text-zinc-600 hover:underline">Hủy</button></div></td>
              </tr>
            ) : (
              <tr key={vatTu.ms} className="border-t border-zinc-100">
                <td className="px-5 py-4 sm:px-6">{vatTu.ms}</td><td className="px-5 py-4 sm:px-6">{getLoaiVatTuLabel(vatTu.ten)}</td><td className="px-5 py-4 sm:px-6">{vatTu.loai}</td><td className="px-5 py-4 sm:px-6">{vatTu.mskh}</td>
                <td className="px-5 py-4 sm:px-6"><div className="flex gap-3"><button type="button" onClick={() => { setEditingId(vatTu.ms); setTen(vatTu.ten); setLoai(vatTu.loai); setMskh(vatTu.mskh) }} className="text-blue-700 hover:underline">Sửa</button><button type="button" onClick={() => void deleteVatTu(vatTu.ms)} className="text-red-700 hover:underline">Xóa</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
