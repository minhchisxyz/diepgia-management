"use client"

import { FormEvent, useMemo, useRef, useState } from "react"
import { createXuatHang, listXuatHang } from "@/app/actions/xuat-hang/data"
import { formatDateTime } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { listProductsForCustomer } from "@/app/actions/san-pham/data"

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
  soHangLe: string
}

type ExportedProduct = {
  mssp: string
  soLuongThung: number
  soHangLe: number
  giaTien?: number
}

type DeliveryItem = {
  soPhieu: number
  mskh: string
  tenKhachHang: string
  tenCongTy: string | null
  diaChiGiaoHang: string
  sdtChanh: string | null
  ngayXuatHang: string
  sanPham: ExportedProduct[]
}

type SortKey = `mskh` | `tenKhachHang` | `tenCongTy` | `diaChiGiaoHang` | `sdtChanh` | `ngayXuatHang`

export default function XuatHangManager({
  customers,
  initialProducts,
  initialDeliveries = [],
  initialTotal = 0,
}: {
  customers: Customer[]
  initialProducts: Product[]
  initialDeliveries?: DeliveryItem[]
  initialTotal?: number
}) {
  const [mskh, setMskh] = useState(``)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [rows, setRows] = useState<ProductRow[]>([{ mssp: ``, soLuongThung: ``, soHangLe: `` }])
  const [diaChiOption, setDiaChiOption] = useState<`Nhận tại kho` | `Khác`>(`Nhận tại kho`)
  const [diaChiKhac, setDiaChiKhac] = useState(``)
  const [sdtChanh, setSdtChanh] = useState(``)
  const [message, setMessage] = useState(``)
  const [isSaving, setIsSaving] = useState(false)

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(initialDeliveries)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: `` })
  const [sort, setSort] = useState<{ key: SortKey; direction: `asc` | `desc` }>({
    key: `ngayXuatHang`,
    direction: `desc`,
  })
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pageCount = Math.max(1, Math.ceil(total / 10))

  const sortedDeliveries = useMemo(() => {
    return [...deliveries].sort((a, b) => {
      const left = String(a[sort.key] ?? ``).toLocaleLowerCase()
      const right = String(b[sort.key] ?? ``).toLocaleLowerCase()
      return left.localeCompare(right, `vi`) * (sort.direction === `asc` ? 1 : -1)
    })
  }, [deliveries, sort])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === `asc` ? `desc` : `asc` }
        : { key, direction: `asc` },
    )
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === `asc` ? ` ↑` : ` ↓`) : ` ↕`
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(``)

    const diaChiGiaoHang = diaChiOption === `Khác` ? diaChiKhac.trim() : `Nhận tại kho`
    const phoneChanh = diaChiOption === `Khác` ? sdtChanh.trim() : null

    if (diaChiOption === `Khác`) {
      if (!diaChiGiaoHang) {
        setMessage(`Vui lòng nhập địa chỉ giao hàng`)
        return
      }
      if (!phoneChanh) {
        setMessage(`Vui lòng nhập số điện thoại chành`)
        return
      }
    }

    setIsSaving(true)

    try {
      const result = await createXuatHang(
        mskh,
        rows.map((row) => ({
          mssp: row.mssp,
          soLuongThung: Number(row.soLuongThung),
          soHangLe: Number(row.soHangLe) || 0,
        })),
        diaChiGiaoHang,
        phoneChanh,
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
      setRows([{ mssp: ``, soLuongThung: ``, soHangLe: `` }])
      setDiaChiOption(`Nhận tại kho`)
      setDiaChiKhac(``)
      setSdtChanh(``)

      void listXuatHang(filters.search, page, 10).then((res) => {
        setDeliveries(res.items)
        setTotal(res.total)
      })
    } catch {
      setMessage(`Không thể tạo phiếu xuất hàng`)
    } finally {
      setIsSaving(false)
    }
  }

  async function selectCustomer(value: string) {
    setMskh(value)
    setRows([{ mssp: ``, soLuongThung: ``, soHangLe: `` }])
    setProducts(value ? await listProductsForCustomer(value) : initialProducts)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
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

            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700">
                Địa chỉ giao hàng (*)
              </p>
              <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-800">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="diaChiGiaoHang"
                    value="Nhận tại kho"
                    checked={diaChiOption === `Nhận tại kho`}
                    onChange={() => setDiaChiOption(`Nhận tại kho`)}
                    className="accent-zinc-900"
                  />
                  <span>Nhận tại kho</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="diaChiGiaoHang"
                    value="Khác"
                    checked={diaChiOption === `Khác`}
                    onChange={() => setDiaChiOption(`Khác`)}
                    className="accent-zinc-900"
                  />
                  <span>Khác</span>
                </label>
              </div>
              {diaChiOption === `Khác` && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                    Địa chỉ giao hàng (*)
                    <input
                      type="text"
                      value={diaChiKhac}
                      onChange={(event) => setDiaChiKhac(event.target.value)}
                      placeholder="Nhập địa chỉ giao hàng"
                      required
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-zinc-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                    Số điện thoại chành (*)
                    <input
                      type="text"
                      value={sdtChanh}
                      onChange={(event) => setSdtChanh(event.target.value)}
                      placeholder="Nhập số điện thoại chành"
                      required
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-zinc-500 focus:outline-none"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-700">Sản phẩm (*):</p>
              {rows.map((row, index) => (
                <div key={index} className="grid min-w-0 gap-3 sm:grid-cols-4">
                  <select
                    value={row.mssp}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, mssp: event.target.value } : item,
                        ),
                      )
                    }
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
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, soLuongThung: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Số lượng thùng"
                    required
                    className="rounded-lg border border-zinc-300 px-3 py-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.soHangLe}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, soHangLe: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Số hàng lẻ"
                    className="rounded-lg border border-zinc-300 px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRows((current) =>
                        current.length === 1
                          ? current
                          : current.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    className="rounded-lg border px-3 py-2"
                  >
                    Xóa
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setRows((current) => [
                    ...current,
                    { mssp: ``, soLuongThung: ``, soHangLe: `` },
                  ])
                }
                className="rounded-lg border px-4 py-2"
              >
                Thêm sản phẩm
              </button>
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

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">
              Danh sách xuất hàng
            </h2>
            <input
              value={filters.search}
              onChange={(event) => {
                const search = event.target.value
                setFilters({ search })
                if (searchTimer.current) clearTimeout(searchTimer.current)
                searchTimer.current = setTimeout(() => {
                  setPage(1)
                  void listXuatHang(search, 1, 10).then((result) => {
                    setDeliveries(result.items)
                    setTotal(result.total)
                  })
                }, 500)
              }}
              placeholder="Lọc theo mã khách hàng"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"
            />
          </div>

          <table className="w-full min-w-275 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`mskh`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    Mã KH{sortLabel(`mskh`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`tenKhachHang`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    Tên khách hàng{sortLabel(`tenKhachHang`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`tenCongTy`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    Tên công ty{sortLabel(`tenCongTy`)}
                  </button>
                </th>
                <th className="px-3 py-3 sm:px-6 font-semibold">
                  Sản phẩm
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`diaChiGiaoHang`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    Địa chỉ giao hàng{sortLabel(`diaChiGiaoHang`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`sdtChanh`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    SĐT chành{sortLabel(`sdtChanh`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`ngayXuatHang`)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    Ngày xuất hàng{sortLabel(`ngayXuatHang`)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                    Không có phiếu xuất hàng nào
                  </td>
                </tr>
              ) : (
                sortedDeliveries.map((item) => (
                  <tr key={item.soPhieu} className="border-t border-zinc-100">
                    <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">
                      {item.mskh}
                    </td>
                    <td className="px-3 py-2 sm:px-6">{item.tenKhachHang}</td>
                    <td className="px-3 py-2 sm:px-6">{item.tenCongTy ?? `—`}</td>
                    <td className="px-3 py-2 sm:px-6">
                      <div className="flex flex-col gap-1 py-1">
                        {item.sanPham.map((sp) => (
                          <div key={sp.mssp} className="whitespace-nowrap">
                            {sp.mssp}: {sp.soLuongThung} Thùng, {sp.soHangLe} lẻ
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-6">{item.diaChiGiaoHang}</td>
                    <td className="px-3 py-2 sm:px-6">{item.sdtChanh ?? `—`}</td>
                    <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                      {formatDateTime(new Date(item.ngayXuatHang))}
                    </td>
                  </tr>
                ))
              )}
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
                    void listXuatHang(filters.search, next, 10).then((r) => {
                      setDeliveries(r.items)
                      setTotal(r.total)
                    })
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm">
                  {page} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  text="Sau"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    const next = Math.min(pageCount, page + 1)
                    setPage(next)
                    void listXuatHang(filters.search, next, 10).then((r) => {
                      setDeliveries(r.items)
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
