"use client"

import { FormEvent, useEffect, useState } from "react"

type KhachHang = {
  mskh: string
  ten: string
  diaChi: string
  email: string | null
  soDienThoai: string
}

export default function KhachHangManager() {
  const [mskh, setMskh] = useState("")
  const [ten, setTen] = useState("")
  const [diaChi, setDiaChi] = useState("")
  const [email, setEmail] = useState("")
  const [soDienThoai, setSoDienThoai] = useState("")
  const [khachHangs, setKhachHangs] = useState<KhachHang[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/khach-hang")
      .then(async (response) => {
        if (response.ok && active) setKhachHangs((await response.json()) as KhachHang[])
      })
      .catch(() => {
        if (active) setMessage("Không thể tải danh sách khách hàng")
      })
    return () => {
      active = false
    }
  }, [])

  async function createKhachHang(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    const response = await fetch("/api/khach-hang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mskh, ten, diaChi, email, soDienThoai }),
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) {
      setMessage(result.error ?? "Không thể tạo khách hàng")
      return
    }
    setMskh("")
    setTen("")
    setDiaChi("")
    setEmail("")
    setSoDienThoai("")
    setMessage("Đã tạo khách hàng")
    const customersResponse = await fetch("/api/khach-hang")
    if (customersResponse.ok) setKhachHangs((await customersResponse.json()) as KhachHang[])
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Khách hàng</h1>
          <form onSubmit={createKhachHang} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              value={mskh}
              onChange={(event) => setMskh(event.target.value)}
              placeholder="Mã khách hàng"
              required
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
            <input
              value={ten}
              onChange={(event) => setTen(event.target.value)}
              placeholder="Tên khách hàng"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
            <input
              value={diaChi}
              onChange={(event) => setDiaChi(event.target.value)}
              placeholder="Địa chỉ"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
            <input
              value={soDienThoai}
              onChange={(event) => setSoDienThoai(event.target.value)}
              placeholder="Số điện thoại"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email (không bắt buộc)"
              className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 sm:col-span-2"
            />
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 sm:col-span-2">
              Tạo khách hàng
            </button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <h2 className="p-5 text-xl font-semibold text-zinc-900 sm:p-6">Danh sách khách hàng</h2>
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-5 py-3 sm:px-6">Mã khách hàng</th>
                <th className="px-5 py-3 sm:px-6">Tên</th>
                <th className="px-5 py-3 sm:px-6">Địa chỉ</th>
                <th className="px-5 py-3 sm:px-6">Email</th>
                <th className="px-5 py-3 sm:px-6">Số điện thoại</th>
              </tr>
            </thead>
            <tbody>
              {khachHangs.map((khachHang) => (
                <tr key={khachHang.mskh} className="border-t border-zinc-100">
                  <td className="px-5 py-4 sm:px-6">{khachHang.mskh}</td>
                  <td className="px-5 py-4 sm:px-6">{khachHang.ten}</td>
                  <td className="px-5 py-4 sm:px-6">{khachHang.diaChi}</td>
                  <td className="px-5 py-4 sm:px-6">{khachHang.email ?? "—"}</td>
                  <td className="px-5 py-4 sm:px-6">{khachHang.soDienThoai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
