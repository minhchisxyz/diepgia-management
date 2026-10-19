"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { getLoaiVatTuLabel, loaiVatTuLabels } from "@/lib/loai-vat-tu"
import { deleteVatTu as deleteVatTuAction, listVatTu, listVatTuPrices, saveVatTuPrice, createVatTu as createVatTuAction, updateVatTu as updateVatTuAction, importMaterial } from "@/app/actions/vat-tu/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { formatPrice } from "@/lib/utils"
import {CancelButton, DeleteButton, EditButton, ImportButton, SaveButton, SearchButton} from "@/components/buttons";

type VatTu = {
  ms: string
  ten: keyof typeof loaiVatTuLabels
  kho: number
  donGia: string | null
}
type Price = { id: string; ngay: string; donGia: string }
type SortKey = "ms" | "kho"

export default function VatTuManager() {
  const [vatTus, setVatTus] = useState<VatTu[]>([])
  const [filter, setFilter] = useState("")
  const [ms, setMs] = useState("")
  const [ten, setTen] = useState<VatTu["ten"]>("THUNG")
  const [kho, setKho] = useState("0")
  const [nhapHang, setNhapHang] = useState('')
  const [nhapHangId, setNhapHangId] = useState<string | null>(null)
  const [priceDate] = useState(new Date().toISOString().slice(0, 10))
  const [price, setPrice] = useState("")
  const [priceEditingId, setPriceEditingId] = useState<string | null>(null)
  const [openPriceId, setOpenPriceId] = useState<string | null>(null)
  const [priceHistory, setPriceHistory] = useState<Record<string, Price[]>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "ms", direction: "asc" })
  const [message, setMessage] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadVatTus(search = filter) {
    const result = await listVatTu(search, page, 10); setVatTus(result.items as VatTu[]); setTotal(result.total)
  }

  useEffect(() => {
    let active = true
    listVatTu("", 1, 10)
      .then(async (vatTusResult) => {
        if (!active) return
        setVatTus(vatTusResult.items as VatTu[]); setTotal(vatTusResult.total)
      })
      .catch(() => {
        if (active) setMessage("Không thể tải dữ liệu")
      })
    return () => {
      active = false
    }
  }, [])

  const sortedVatTus = useMemo(() => [...vatTus].sort((a, b) => {
    let result: number
    if (sort.key === "kho") {
      result = a.kho - b.kho
    } else {
      result = String(a[sort.key]).localeCompare(String(b[sort.key]), "vi")
    }
    return sort.direction === "asc" ? result : -result
  }), [vatTus, sort])
  const pageCount = Math.max(1, Math.ceil(total / 10))

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
    const result = await createVatTuAction({ ms, ten }) as { error?: string }
    if (result.error) {
      setMessage(result.error ?? "Không thể tạo vật tư")
      return
    }
    setMs("")
    setKho("0")
    setMessage("Đã tạo vật tư")
    await loadVatTus()
  }

  async function saveVatTu(id: string) {
    const result = await updateVatTuAction(id, { ten, kho: Number(kho) }) as { error?: string }
    setMessage(result.error ? result.error : "Đã cập nhật vật tư")
    if (!result.error) {
      setEditingId(null)
      await loadVatTus()
    }
  }

  async function deleteVatTu(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa vật tư này?")) return
    const result = await deleteVatTuAction(id) as { error?: string }
    setMessage(result.error ? result.error : "Đã xóa vật tư")
    if (!result.error) await loadVatTus()
  }

  async function importVatTu(ms: string, soLuong: string) {
    const result = await importMaterial(ms, Number(soLuong)) as { error?: string }
    setMessage(result?.error ? result?.error : "Đã nhập hàng")
    if (!result?.error) {
      setNhapHang("")
      await loadVatTus()
    }
  }

  async function savePrice(ms: string) {
    const result = await saveVatTuPrice(ms, priceDate, Number(price)) as { error?: string }
    setMessage(result.error ? result.error : "Đã cập nhật đơn giá")
    if (!result.error) {
      setPriceEditingId(null)
      await loadVatTus()
      await loadPriceHistory(ms)
    }
  }

  async function loadPriceHistory(ms: string) {
    const prices = await listVatTuPrices(ms)
    setPriceHistory((current) => ({ ...current, [ms]: prices as unknown as Price[] }))
  }

  const columns: { key: keyof VatTu; label: string }[] = [
    { key: "ms", label: "Mã vật tư" },
    { key: "ten", label: "Tên" },
    { key: "kho", label: "Tồn kho" },
  ]

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Vật tư</h1>
          <form onSubmit={createVatTu} className="mt-5 grid gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã vật tư (*)
              <input value={ms} onChange={(event) => setMs(event.target.value)} placeholder="Nhập mã vật tư" required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên (*)
              <select value={ten} onChange={(event) => setTen(event.target.value as VatTu["ten"])} className="rounded-lg border border-zinc-300 px-3 py-2 font-normal">{Object.keys(loaiVatTuLabels).map((value) => <option key={value} value={value}>{getLoaiVatTuLabel(value as VatTu["ten"])}</option>)}</select>
            </label>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700">Tạo vật tư</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách vật tư</h2>
            <input value={filter}
                   onChange={(event) => {
                     const value = event.target.value
                     setFilter(value)
                     if (searchTimer.current) clearTimeout(searchTimer.current)
                     searchTimer.current = setTimeout(() => {
                       setPage(1)
                       void listVatTu(value, 1, 10).then((result) => {
                         setVatTus(result.items as VatTu[])
                         setTotal(result.total)
                       })
                     }, 500)
                   }}
                   placeholder="Lọc theo mã vật tư"
                   className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"/>
          </div>
          <table className="w-full min-w-175 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>{columns.map((column) =>
                  <th key={column.key} className="px-5 py-3 sm:px-6">
                    {column.key === "ms" || column.key === "kho" ? (
                      <button type="button" onClick={() => toggleSort(column.key as SortKey)} className="font-semibold hover:text-zinc-900">{column.label}{sortLabel(column.key as SortKey)}</button>
                    ) : (
                      <span className="font-semibold">{column.label}</span>
                    )}
                  </th>)}
                <th className="px-3 py-3 sm:px-6">Đơn giá hôm nay</th>
                <th className="px-3 py-3 sm:px-6">Nhập hàng</th>
                <th className="px-5 py-3 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>{sortedVatTus.map((vatTu) => editingId === vatTu.ms ? (              <tr key={vatTu.ms} className="border-t border-zinc-100">
                <td className="px-5 py-3 sm:px-6">{vatTu.ms}</td>
                <td className="px-5 py-3 sm:px-6">
                  <select value={ten}
                          onChange={(event) => setTen(event.target.value as VatTu["ten"])}
                          className="rounded border border-zinc-300 px-2 py-1">{Object.keys(loaiVatTuLabels).map((value) =>
                      <option key={value} value={value}>{getLoaiVatTuLabel(value as VatTu["ten"])}</option>)}</select></td>
                <td className="px-5 py-3 sm:px-6">
                  <input type="number"
                         min="0"
                         step="1"
                         value={kho}
                         onChange={(event) => setKho(event.target.value)}
                         className="w-full rounded border border-zinc-300 px-2 py-1"/></td>
                <td className="px-5 py-3 sm:px-6">—</td>
                <td className="px-5 py-3 sm:px-6">—</td>
                <td className="px-5 py-3 sm:px-6">
                  <div className="flex gap-2">
                    <SaveButton onClick={() => void saveVatTu(vatTu.ms)} />
                    <CancelButton onClick={() => setEditingId(null)} />
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={vatTu.ms} className="border-t border-zinc-100">
                <td className="px-5 py-4 sm:px-6">{vatTu.ms}</td>
                <td className="px-5 py-4 sm:px-6">{getLoaiVatTuLabel(vatTu.ten)}</td>
                <td className="px-5 py-4 sm:px-6">{vatTu.kho}</td>
                <td className="px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span>{vatTu.donGia === null ? "Chưa có giá" : formatPrice(vatTu.donGia)}</span>
                    <SearchButton onClick={() => {
                      const nextId = openPriceId === vatTu.ms ? null : vatTu.ms
                      setOpenPriceId(nextId)
                      if (nextId && !priceHistory[vatTu.ms]) void loadPriceHistory(vatTu.ms)
                    }} />
                  </div>
                  {openPriceId === vatTu.ms && <div className="absolute mt-2 min-w-72 rounded-lg border border-zinc-200 bg-zinc-50 p-2 shadow-md z-20">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50">
                        <tr className="border-b border-zinc-200">
                          <th className="px-2 py-1">Ngày</th>
                          <th className="px-2 py-1">Đơn giá</th>
                        </tr>
                      </thead>
                      <tbody>{(priceHistory[vatTu.ms] ?? []).map((entry) =>
                        <tr key={entry.id} className="border-b border-zinc-100 last:border-0">
                          <td className="px-2 py-1">{entry.ngay.slice(0, 10)}</td>
                          <td className="px-2 py-1">{formatPrice(entry.donGia)}</td>
                        </tr>)}
                      </tbody>
                    </table>
                    {(priceHistory[vatTu.ms] ?? []).length === 0 && <p className="px-2 py-1 text-xs text-zinc-500">Chưa có lịch sử đơn giá</p>}
                  </div>}
                  <div className="mt-1 flex gap-1">
                    <input type="number"
                           min="0"
                           step="1"
                           value={priceEditingId === vatTu.ms ? price : ""}
                           onChange={(event) => {
                             setPriceEditingId(vatTu.ms);
                             setPrice(event.target.value)
                           }}
                           placeholder="Giá mới"
                           className="w-24 rounded border border-zinc-300 px-1 py-1"/>
                    <SaveButton onClick={() => void savePrice(vatTu.ms)} />
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <div className={`flex flex-row items-center justify-start`}>
                    <input type="number"
                           min="0"
                           step="1"
                           value={nhapHangId === vatTu.ms ? nhapHang : ''}
                           onChange={(event) => {
                             setNhapHangId(vatTu.ms)
                             setNhapHang(event.target.value)
                           }}
                           className="w-24 rounded border border-zinc-300 px-2 py-1"/>
                    <ImportButton onClick={() => importVatTu(vatTu.ms, nhapHang)}/>
                  </div>
                </td>
                <td className="px-5 py-4 sm:px-6">
                  <div className="flex gap-3">
                    <ImportButton onClick={() => {}}/>
                    <EditButton onClick={() => {
                      setEditingId(vatTu.ms)
                      setTen(vatTu.ten)
                      setKho(String(vatTu.kho)) }}
                    />
                    <DeleteButton onClick={() => void deleteVatTu(vatTu.ms)} />
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          <Pagination className="p-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious text="Trước"
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      const next = Math.max(1, page - 1);
                                      setPage(next)
                                      void listVatTu(filter, next, 10).then((r) => {
                                        setVatTus(r.items as VatTu[])
                                        setTotal(r.total)
                                      })
                                    }}/>
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm">{page} / {pageCount}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext text="Sau" href="#" onClick={(e) => {
                  e.preventDefault()
                  const next=Math.min(pageCount,page+1)
                  setPage(next)
                  void listVatTu(filter,next,10).then((r)=>{setVatTus(r.items as VatTu[]);setTotal(r.total)}) }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </div>
    </main>
  )
}
