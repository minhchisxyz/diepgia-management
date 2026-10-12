"use client"

import { FormEvent, useState } from "react"
import { createXuatHang, listProductsForCustomer } from "@/app/actions/data"

type Customer = {
  mskh: string
  ten: string
  tenCongTy: string | null
}

type Product = {
  mssp: string
  tenPhanBon: string
  tenThuongMai: string
  quyCach: string
}

type ProductRow = {
  mssp: string
  soLuongThung: string
}

export default function XuatHangManager({
  customers,
  initialProducts,
}: {
  customers: Customer[]
  initialProducts: Product[]
}) {
  const [mskh, setMskh] = useState(``)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [rows, setRows] = useState<ProductRow[]>([{ mssp: ``, soLuongThung: `` }])
  const [message, setMessage] = useState(``)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(``)
    setIsSaving(true)

    try {
      const result = await createXuatHang(
        mskh,
        rows.map((row) => ({
          mssp: row.mssp,
          soLuongThung: Number(row.soLuongThung),
        })),
      )
      if (`error` in result) {
        setMessage(result.error ?? `Không thể tạo phiếu xuất hàng`)
        return
      }

      const binary = Uint8Array.from(
        atob(result.data),
        (character) => character.charCodeAt(0),
      )
      const file = new Blob([binary], {
        type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
      })
      const url = URL.createObjectURL(file)
      const link = document.createElement(`a`)
      link.href = url
      link.download = result.fileName
      link.click()
      URL.revokeObjectURL(url)
      setMessage(`Đã tạo phiếu xuất hàng số ${result.soPhieu}`)
      setRows([{ mssp: ``, soLuongThung: `` }])
    } catch {
      setMessage(`Không thể tạo phiếu xuất hàng`)
    } finally {
      setIsSaving(false)
    }
  }

  async function selectCustomer(value: string) {
    setMskh(value)
    setRows([{ mssp: ``, soLuongThung: `` }])
    setProducts(value ? await listProductsForCustomer(value) : initialProducts)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            Xuất hàng
          </h1>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Khách hàng (*)
              <select
                value={mskh}
                onChange={(event) => void selectCustomer(event.target.value)}
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
              >
                <option value="">Chọn khách hàng</option>
                {customers.map((customer) => (
                  <option key={customer.mskh} value={customer.mskh}>
                    {customer.mskh}-{customer.ten}{customer.tenCongTy ? `-${customer.tenCongTy}` : ``}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-700">Sản phẩm (*):</p>
              {rows.map((row, index) => (
                <div key={index} className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <select
                    value={row.mssp}
                    onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, mssp: event.target.value } : item))}
                    required
                    title={products.find((product) => product.mssp === row.mssp)?.tenThuongMai}
                    className="min-w-0 w-full truncate rounded-lg border border-zinc-300 px-3 py-2"
                  >
                    <option value="">Chọn sản phẩm</option>
                    {products.map((product) => (
                      <option key={product.mssp} value={product.mssp}>
                        {product.mssp}-{product.tenThuongMai}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.soLuongThung}
                    onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, soLuongThung: event.target.value } : item))}
                    placeholder="Số lượng thùng"
                    required
                    className="rounded-lg border border-zinc-300 px-3 py-2"
                  />
                  <button type="button" onClick={() => setRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg border px-3 py-2">Xóa</button>
                </div>
              ))}
              <button type="button" onClick={() => setRows((current) => [...current, { mssp: ``, soLuongThung: `` }])} className="rounded-lg border px-4 py-2">Thêm sản phẩm</button>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white disabled:opacity-50"
            >
              {isSaving ? `Đang lưu...` : `Xuất hàng`}
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-zinc-600">{message}</p>}
        </section>
      </div>
    </main>
  )
}
