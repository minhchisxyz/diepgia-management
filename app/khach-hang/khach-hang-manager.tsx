"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type KhachHang = {
  mskh: string
  ten: string
  tenCongTy: string | null
  diaChi: string
  tinh: string
  email: string | null
  maSoThue: string | null
  soDienThoai: string | null
}

type CustomerDraft = Omit<KhachHang, "mskh">
type SortKey = keyof KhachHang

const emptyDraft: CustomerDraft = {
  ten: "",
  tenCongTy: "",
  diaChi: "",
  tinh: "",
  email: "",
  maSoThue: "",
  soDienThoai: "",
}

export default function KhachHangManager() {
  const [mskh, setMskh] = useState("")
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft)
  const [khachHangs, setKhachHangs] = useState<KhachHang[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "mskh", direction: "asc" })
  const [message, setMessage] = useState("")

  async function load() {
    const response = await fetch("/api/khach-hang")
    if (response.ok) setKhachHangs(await response.json() as KhachHang[])
  }

  useEffect(() => {
    let active = true
    fetch("/api/khach-hang")
      .then(async (response) => {
        if (response.ok && active) setKhachHangs(await response.json() as KhachHang[])
      })
      .catch(() => {
        if (active) setMessage("Không thể tải danh sách khách hàng")
      })
    return () => {
      active = false
    }
  }, [])

  const sortedCustomers = useMemo(() => [...khachHangs].sort((a, b) => {
    const left = String(a[sort.key] ?? "").toLocaleLowerCase()
    const right = String(b[sort.key] ?? "").toLocaleLowerCase()
    return left.localeCompare(right, "vi") * (sort.direction === "asc" ? 1 : -1)
  }), [khachHangs, sort])

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" })
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕"
  }

  async function createKhachHang(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    const response = await fetch("/api/khach-hang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mskh, ...draft }),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) {
      setMessage(result.error ?? "Không thể tạo khách hàng")
      return
    }
    setMskh("")
    setDraft(emptyDraft)
    setMessage("Đã tạo khách hàng")
    await load()
  }

  async function saveCustomer(id: string) {
    const response = await fetch(`/api/khach-hang/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã cập nhật khách hàng" : result.error ?? "Không thể cập nhật khách hàng")
    if (response.ok) {
      setEditingId(null)
      await load()
    }
  }

  async function deleteCustomer(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa khách hàng này?")) return
    const response = await fetch(`/api/khach-hang/${encodeURIComponent(id)}`, { method: "DELETE" })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã xóa khách hàng" : result.error ?? "Không thể xóa khách hàng")
    if (response.ok) await load()
  }

  function startEdit(customer: KhachHang) {
    setEditingId(customer.mskh)
    setDraft({
      ten: customer.ten,
      tenCongTy: customer.tenCongTy ?? "",
      diaChi: customer.diaChi,
      tinh: customer.tinh,
      email: customer.email ?? "",
      maSoThue: customer.maSoThue ?? "",
      soDienThoai: customer.soDienThoai ?? "",
    })
  }

  function editInput(field: keyof CustomerDraft, required = false) {
    return (
      <input
        value={draft[field] ?? ""}
        onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
        required={required}
        className="w-full min-w-28 rounded border border-zinc-300 px-2 py-1"
      />
    )
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "mskh", label: "Mã khách hàng" },
    { key: "ten", label: "Tên" },
    { key: "tenCongTy", label: "Tên công ty" },
    { key: "diaChi", label: "Địa chỉ" },
    { key: "tinh", label: "Tỉnh" },
    //{ key: "email", label: "Email" },
    { key: "maSoThue", label: "Mã số thuế" },
    { key: "soDienThoai", label: "Số điện thoại" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Khách hàng</h1>
          <form onSubmit={createKhachHang} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã khách hàng (*)
              <input value={mskh} onChange={(event) => setMskh(event.target.value)} placeholder="Nhập mã khách hàng" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên khách hàng (*)
              <input value={draft.ten} onChange={(event) => setDraft({ ...draft, ten: event.target.value })} placeholder="Nhập tên khách hàng" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên công ty
              <input value={draft.tenCongTy ?? ""} onChange={(event) => setDraft({ ...draft, tenCongTy: event.target.value })} placeholder="Nhập tên công ty" className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Địa chỉ (*)
              <input value={draft.diaChi} onChange={(event) => setDraft({ ...draft, diaChi: event.target.value })} placeholder="Nhập địa chỉ" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tỉnh (*)
              <input value={draft.tinh} onChange={(event) => setDraft({ ...draft, tinh: event.target.value })} placeholder="Nhập tỉnh" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Số điện thoại
              <input value={draft.soDienThoai ?? ""} onChange={(event) => setDraft({ ...draft, soDienThoai: event.target.value })} placeholder="Nhập số điện thoại" className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã số thuế
              <input value={draft.maSoThue ?? ""} onChange={(event) => setDraft({ ...draft, maSoThue: event.target.value })} placeholder="Nhập mã số thuế" className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Email
              <input type="email" value={draft.email ?? ""} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="Nhập email" className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 lg:col-span-4">Tạo khách hàng</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <h2 className="p-5 text-xl font-semibold text-zinc-900 sm:p-6">Danh sách khách hàng</h2>
          <table className="w-full min-w-275 text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                {columns.map((column) => <th key={column.key}
                                             className="px-3 py-2 sm:px-6">
                  <button type="button" onClick={() => toggleSort(column.key)}
                          className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key)}</button>
                </th>)}
                <th className="px-3 py-3 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer) => editingId === customer.mskh ? (
                <tr key={customer.mskh} className="border-t border-zinc-100">
                  <td className="px-3 py-2 sm:px-6">{customer.mskh}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("ten", true)}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("tenCongTy")}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("diaChi", true)}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("tinh", true)}</td>
                  {/*<td className="px-3 py-2 sm:px-6">{editInput("email")}</td>*/}
                  <td className="px-3 py-2 sm:px-6">{editInput("maSoThue")}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("soDienThoai")}</td>
                  <td className="px-3 py-2 sm:px-6"><div className="flex gap-2"><button type="button" onClick={() => void saveCustomer(customer.mskh)} className="text-green-700 hover:underline">Lưu</button><button type="button" onClick={() => setEditingId(null)} className="text-zinc-600 hover:underline">Hủy</button></div></td>
                </tr>
              ) : (
                <tr key={customer.mskh} className="border-t border-zinc-100">
                  <td className="px-3 py-2 sm:px-6">{customer.mskh}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.ten}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.tenCongTy ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.diaChi}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.tinh}</td>
                  {/*<td className="px-3 py-2 sm:px-6">{customer.email ?? "—"}</td>*/}
                  <td className="px-3 py-2 sm:px-6">{customer.maSoThue ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.soDienThoai ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => startEdit(customer)} className="text-blue-700 hover:underline">Sửa</button>
                      <button type="button" onClick={() => void deleteCustomer(customer.mskh)} className="text-red-700 hover:underline">Xóa</button>
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
