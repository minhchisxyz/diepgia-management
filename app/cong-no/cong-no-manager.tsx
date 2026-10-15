"use client"

import { FormEvent, useMemo, useState } from "react"
import { BangCongNoRow, createThuTien, getBangCongNo } from "@/app/actions/cong-no/data"
import {downloadFile, formatDateTime, formatPrice} from "@/lib/utils"

type Customer = {
  mskh: string
  ten: string
  tenCongTy: string | null
}

type SortKey =
  | `ngay`
  | `soPhieu`
  | `tenKhachHang`
  | `tenCongTy`
  | `mssp`
  | `tenThuongMai`
  | `quyCach`
  | `quyCachThung`
  | `donGia`
  | `soLuongThung`
  | `soHangLe`
  | `giaTien`
  | `traTien`

export default function CongNoManager({
  customers,
}: {
  customers: Customer[]
}) {
  const [mskh, setMskh] = useState(``)
  const [soTien, setSoTien] = useState(``)
  const [lyDo, setLyDo] = useState(``)
  const [noiNhan, setNoiNhan] = useState(``)
  const [ngayThu, setNgayThu] = useState(() => new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState(``)
  const [isSaving, setIsSaving] = useState(false)

  // Bảng công nợ state
  const [selectedMskh, setSelectedMskh] = useState(``)
  const [startDate, setStartDate] = useState(``)
  const [endDate, setEndDate] = useState(``)
  const [items, setItems] = useState<BangCongNoRow[]>([])
  const [congNo, setCongNo] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState(``)

  const [sort, setSort] = useState<{ key: SortKey; direction: `asc` | `desc` }>({
    key: `ngay`,
    direction: `asc`,
  })

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison
      if (sort.key === `ngay`) {
        comparison = new Date(a.ngay).getTime() - new Date(b.ngay).getTime()
      } else if (
        sort.key === `soPhieu` ||
        sort.key === `quyCachThung` ||
        sort.key === `donGia` ||
        sort.key === `soLuongThung` ||
        sort.key === `soHangLe` ||
        sort.key === `giaTien` ||
        sort.key === `traTien`
      ) {
        const numA = a[sort.key] ?? -Infinity
        const numB = b[sort.key] ?? -Infinity
        comparison = (numA as number) - (numB as number)
      } else {
        const strA = String(a[sort.key] ?? ``).toLocaleLowerCase()
        const strB = String(b[sort.key] ?? ``).toLocaleLowerCase()
        comparison = strA.localeCompare(strB, `vi`)
      }
      return sort.direction === `asc` ? comparison : -comparison
    })
  }, [items, sort])

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

  async function fetchCongNoData(customerCode: string, start: string, end: string) {
    if (!start || !end) {
      setSearchError(`Vui lòng chọn ngày bắt đầu và ngày kết thúc`)
      return
    }

    setIsLoading(true)
    setSearchError(``)

    try {
      const result = await getBangCongNo({
        mskh: customerCode || undefined,
        startDate: start,
        endDate: end,
      })

      if (result.error) {
        setSearchError(result.error)
        return
      }

      setItems(result.items)
      setCongNo(result.congNo)
      setHasSearched(true)
    } catch {
      setSearchError(`Không thể tải bảng công nợ`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleTra() {
    await fetchCongNoData(selectedMskh, startDate, endDate)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(``)

    const amount = Number(soTien)
    if (!Number.isInteger(amount) || amount <= 0) {
      setMessage(`Số tiền phải là số nguyên lớn hơn 0`)
      return
    }

    setIsSaving(true)

    try {
      const result = await createThuTien({
        mskh,
        soTien: amount,
        lyDo,
        noiNhan,
        ngayThu,
      })

      if (`error` in result) {
        setMessage(result.error ?? `Không thể tạo phiếu thu tiền`)
        return
      }

      downloadFile(result.data, result.fileName)

      setMessage(`Đã tạo phiếu thu tiền số ${result.soPhieu}`)
      setMskh(``)
      setSoTien(``)
      setLyDo(``)
      setNoiNhan(``)
      setNgayThu(new Date().toISOString().slice(0, 10))

      if (hasSearched && startDate && endDate) {
        void fetchCongNoData(selectedMskh, startDate, endDate)
      }
    } catch {
      setMessage(`Không thể tạo phiếu thu tiền`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            Thu tiền
          </h1>
          <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Khách hàng (*)
              <select
                value={mskh}
                onChange={(event) => setMskh(event.target.value)}
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

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Ngày thu (*)
              <input
                type="date"
                value={ngayThu}
                onChange={(event) => setNgayThu(event.target.value)}
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Số tiền (*)
              <input
                type="number"
                min="1"
                step="1"
                value={soTien}
                onChange={(event) => setSoTien(event.target.value)}
                placeholder="Nhập số tiền"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Nơi nhận (*)
              <input
                type="text"
                value={noiNhan}
                onChange={(event) => setNoiNhan(event.target.value)}
                placeholder="Nhập nơi nhận tiền"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 sm:col-span-2">
              Lý do thu (*)
              <input
                type="text"
                value={lyDo}
                onChange={(event) => setLyDo(event.target.value)}
                placeholder="Nhập lý do thu tiền"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {isSaving ? `Đang lưu...` : `Tạo phiếu thu`}
              </button>
            </div>
          </form>
          {message && <p className="mt-4 text-sm text-zinc-600">{message}</p>}
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4 sm:p-6 overflow-x-auto">
            <h2 className="text-xl font-semibold text-zinc-900 whitespace-nowrap shrink-0">
              Bảng công nợ
            </h2>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <select
                value={selectedMskh}
                onChange={(event) => setSelectedMskh(event.target.value)}
                className="w-44 sm:w-56 truncate rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm"
                title={selectedMskh ? `${selectedMskh} - ${customers.find((c) => c.mskh === selectedMskh)?.ten ?? ``}` : `Tất cả khách hàng`}
              >
                <option value="">Tất cả khách hàng</option>
                {customers.map((customer) => (
                  <option key={customer.mskh} value={customer.mskh}>
                    {customer.mskh} - {customer.ten}{customer.tenCongTy ? ` - ${customer.tenCongTy}` : ``}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1 text-sm text-zinc-700 whitespace-nowrap shrink-0">
                <span>Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </label>

              <label className="flex items-center gap-1 text-sm text-zinc-700 whitespace-nowrap shrink-0">
                <span>Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </label>

              <div className="text-sm font-semibold text-zinc-900 whitespace-nowrap shrink-0">
                Công nợ: <span className={congNo > 0 ? `text-amber-600` : congNo < 0 ? `text-blue-600` : `text-zinc-900`}>{hasSearched ? `${formatPrice(congNo)} đ` : `0 đ`}</span>
              </div>

              <button
                type="button"
                onClick={handleTra}
                disabled={!startDate || !endDate || isLoading}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isLoading ? `Đang tra...` : `Tra`}
              </button>
            </div>
          </div>

          {searchError && (
            <p className="px-5 pb-3 text-sm text-red-600 sm:px-6">{searchError}</p>
          )}

          <table className="w-full min-w-350 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`ngay`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Ngày{sortLabel(`ngay`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`soPhieu`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Số hợp đồng{sortLabel(`soPhieu`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`tenKhachHang`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Tên khách hàng{sortLabel(`tenKhachHang`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`tenCongTy`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Tên công ty{sortLabel(`tenCongTy`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`mssp`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    MSSP{sortLabel(`mssp`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`tenThuongMai`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Tên thương mại{sortLabel(`tenThuongMai`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`quyCach`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Quy cách{sortLabel(`quyCach`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`quyCachThung`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Quy cách thùng{sortLabel(`quyCachThung`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`donGia`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Giá{sortLabel(`donGia`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`soLuongThung`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Tổng thùng{sortLabel(`soLuongThung`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`soHangLe`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Hàng lẻ{sortLabel(`soHangLe`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`giaTien`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Tổng tiền{sortLabel(`giaTien`)}
                  </button>
                </th>
                <th className="px-3 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => toggleSort(`traTien`)}
                    className="font-semibold hover:text-zinc-900 whitespace-nowrap"
                  >
                    Trả tiền{sortLabel(`traTien`)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {!hasSearched ? null : sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                    Không có dữ liệu công nợ trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                sortedItems.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                      {formatDateTime(new Date(item.ngay))}
                    </td>
                    <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">
                      {item.soPhieu}
                    </td>
                    <td className="px-3 py-2 sm:px-6">
                      {item.tenKhachHang}
                    </td>
                    <td className="px-3 py-2 sm:px-6">
                      {item.tenCongTy ?? `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6 font-mono text-xs">
                      {item.mssp ?? `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6">
                      {item.tenThuongMai ?? `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6">
                      {item.quyCach ?? `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6">
                      {item.quyCachThung ?? `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                      {item.donGia !== null ? `${formatPrice(item.donGia)} đ` : `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6">
                      {item.soLuongThung !== null ? item.soLuongThung : `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6">
                      {item.soHangLe !== null ? item.soHangLe : `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900 whitespace-nowrap">
                      {item.giaTien !== null ? `${formatPrice(item.giaTien)} đ` : `—`}
                    </td>
                    <td className="px-3 py-2 sm:px-6 font-medium text-emerald-700 whitespace-nowrap">
                      {item.traTien !== null ? `${formatPrice(item.traTien)} đ` : `—`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
