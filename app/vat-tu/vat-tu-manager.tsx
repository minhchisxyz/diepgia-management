"use client"

import { FormEvent, useEffect, useState } from "react"
import { getLoaiVatTuLabel, loaiVatTuLabels } from "@/lib/loai-vat-tu"

type KhachHang = { mskh: string }
type VatTu = {
  ms: string
  ten: keyof typeof loaiVatTuLabels
  loai: string
  mskh: string
}

export default function VatTuManager() {
  const [vatTus, setVatTus] = useState<VatTu[]>([])
  const [khachHangs, setKhachHangs] = useState<KhachHang[]>([])
  const [customerFilter, setCustomerFilter] = useState("")
  const [ms, setMs] = useState("")
  const [ten, setTen] = useState<VatTu["ten"]>("THUNG")
  const [loai, setLoai] = useState("")
  const [mskh, setMskh] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    Promise.all([fetch("/api/vat-tu"), fetch("/api/khach-hang")])
      .then(async ([vatTuResponse, khachHangResponse]) => {
        if (!active) return
        if (vatTuResponse.ok) setVatTus((await vatTuResponse.json()) as VatTu[])
        if (khachHangResponse.ok) setKhachHangs((await khachHangResponse.json()) as KhachHang[])
      })
      .catch(() => {
        if (active) setMessage("Không thể tải dữ liệu")
      })
    return () => {
      active = false
    }
  }, [])

  async function createVatTu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    const response = await fetch("/api/vat-tu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ms, ten, loai, mskh }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) {
      setMessage(result.error ?? "Không thể tạo vật tư")
      return
    }
    setMs("")
    setLoai("")
    setMskh("")
    setMessage("Đã tạo vật tư")
    const vatTuResponse = await fetch(`/api/vat-tu${customerFilter ? `?mskh=${encodeURIComponent(customerFilter)}` : ""}`)
    if (vatTuResponse.ok) setVatTus((await vatTuResponse.json()) as VatTu[])
  }

  async function filterVatTus(value: string) {
    setCustomerFilter(value)
    const [vatTuResponse, khachHangResponse] = await Promise.all([
      fetch(`/api/vat-tu${value ? `?mskh=${encodeURIComponent(value)}` : ""}`),
      fetch(`/api/khach-hang${value ? `?search=${encodeURIComponent(value)}` : ""}`),
    ])
    if (vatTuResponse.ok) setVatTus((await vatTuResponse.json()) as VatTu[])
    if (khachHangResponse.ok) setKhachHangs((await khachHangResponse.json()) as KhachHang[])
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Vật tư</h1>
          <form onSubmit={createVatTu} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input value={ms} onChange={(event) => setMs(event.target.value)} placeholder="Mã vật tư" required className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" />
            <select value={ten} onChange={(event) => setTen(event.target.value as VatTu["ten"])} className="rounded-lg border border-zinc-300 px-3 py-2">
              {Object.keys(loaiVatTuLabels).map((value) => <option key={value} value={value}>{getLoaiVatTuLabel(value as VatTu["ten"])}</option>)}
            </select>
            <input value={loai} onChange={(event) => setLoai(event.target.value)} placeholder="Loại" required className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" />
            <select value={mskh} onChange={(event) => setMskh(event.target.value)} required className="rounded-lg border border-zinc-300 px-3 py-2">
              <option value="">Chọn mã khách hàng</option>
              {khachHangs.map((khachHang) => <option key={khachHang.mskh} value={khachHang.mskh}>{khachHang.mskh}</option>)}
            </select>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 sm:col-span-2 lg:col-span-4">Tạo vật tư</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách vật tư</h2>
            <input value={customerFilter} onChange={(event) => { void filterVatTus(event.target.value) }} placeholder="Lọc theo mã khách hàng" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
          </div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr><th className="px-5 py-3 sm:px-6">Mã vật tư</th><th className="px-5 py-3 sm:px-6">Tên</th><th className="px-5 py-3 sm:px-6">Loại</th><th className="px-5 py-3 sm:px-6">Mã khách hàng</th></tr>
            </thead>
            <tbody>
              {vatTus.map((vatTu) => (
                <tr key={vatTu.ms} className="border-t border-zinc-100">
                  <td className="px-5 py-4 sm:px-6">{vatTu.ms}</td><td className="px-5 py-4 sm:px-6">{getLoaiVatTuLabel(vatTu.ten)}</td><td className="px-5 py-4 sm:px-6">{vatTu.loai}</td><td className="px-5 py-4 sm:px-6">{vatTu.mskh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
