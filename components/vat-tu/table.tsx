"use client"

import { use, useMemo, useState } from "react"
import { getLoaiVatTuLabel, loaiVatTuLabels } from "@/lib/loai-vat-tu"
import {
  deleteVatTu as deleteVatTuAction,
  listVatTuPrices,
  saveVatTuPrice,
  updateVatTu as updateVatTuAction,
  importMaterial,
} from "@/lib/actions/vat-tu/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { formatDateTime, formatPrice } from "@/lib/utils"
import {CancelButton, DeleteButton, EditButton, ImportButton, SaveButton, SearchButton} from "@/components/buttons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import { VatTu } from "./form"

type Price = { id: string; ngay: string; donGia: string }
type SortKey = "ms" | "kho"

export default function VatTuTable({
  dataPromise,
  page,
  onPageChange,
  onReload,
}: {
  dataPromise: Promise<{ items: VatTu[]; total: number }>
  page: number
  onPageChange: (newPage: number) => void
  onReload: () => void
}) {
  const { items: vatTus, total } = use(dataPromise)

  const [loai, setLoai] = useState<VatTu["loai"]>("THUNG")
  const [kho, setKho] = useState("0")
  const [importValues, setImportValues] = useState<Record<string, string>>({})
  const [priceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [priceValues, setPriceValues] = useState<Record<string, string>>({})
  const [priceHistory, setPriceHistory] = useState<Record<string, Price[]>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "ms", direction: "asc" })

  const pageSize = 10
  const sortedVatTus = useMemo(() => {
    return [...vatTus].sort((a, b) => {
      const left = a[sort.key]
      const right = b[sort.key]
      const comparison = typeof left === "number" ? left - (right as number) : String(left).localeCompare(String(right), "vi")
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [vatTus, sort])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    )
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ⇅"
  }

  function startEdit(vatTu: VatTu) {
    setEditingId(vatTu.ms)
    setLoai(vatTu.loai)
    setKho(String(vatTu.kho))
  }

  async function saveVatTu(id: string) {
    const result = (await updateVatTuAction(id, { loai, kho: Number(kho) })) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật vật tư")
      setEditingId(null)
      onReload()
    }
  }

  async function deleteVatTu(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa vật tư này?")) return
    const result = (await deleteVatTuAction(id)) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã xóa vật tư")
      onReload()
    }
  }

  async function importVatTu(ms: string) {
    const qtyInput = importValues[ms]
    const soLuong = Number(qtyInput)
    if (!qtyInput || isNaN(soLuong) || soLuong <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ lớn hơn 0")
      return
    }
    const result = (await importMaterial(ms, soLuong)) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã nhập hàng")
      setImportValues((prev) => ({ ...prev, [ms]: "" }))
      onReload()
    }
  }

  async function savePrice(ms: string) {
    const priceInput = priceValues[ms]
    const donGia = Number(priceInput)
    if (!priceInput || isNaN(donGia) || donGia < 0) {
      toast.error("Vui lòng nhập đơn giá hợp lệ không âm")
      return
    }
    const result = (await saveVatTuPrice(ms, priceDate, donGia)) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật đơn giá")
      setPriceValues((prev) => ({ ...prev, [ms]: "" }))
      onReload()
      await loadPriceHistory(ms)
    }
  }

  async function loadPriceHistory(ms: string) {
    const prices = await listVatTuPrices(ms)
    setPriceHistory((current) => ({ ...current, [ms]: prices as unknown as Price[] }))
  }

  const columns: { key: keyof VatTu; label: string }[] = [
    { key: "ms", label: "Mã vật tư" },
    { key: "loai", label: "Loại" },
    { key: "kho", label: "Tồn kho" },
  ]

  return (
    <>
      <table className="w-full min-w-175 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-5 py-3 sm:px-6">
                {column.key === "ms" || column.key === "kho" ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key as SortKey)}
                    className="font-semibold hover:text-zinc-900"
                  >
                    {column.label}
                    {sortLabel(column.key as SortKey)}
                  </button>
                ) : (
                  <span className="font-semibold">{column.label}</span>
                )}
              </th>
            ))}
            <th className="px-3 py-3 sm:px-6 font-semibold">Đơn giá hôm nay</th>
            <th className="px-3 py-3 sm:px-6 font-semibold">Nhập hàng</th>
            <th className="px-5 py-3 sm:px-6 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sortedVatTus.map((vatTu) =>
            editingId === vatTu.ms ? (
              <tr key={vatTu.ms} className="border-t border-zinc-100 bg-zinc-50">
                <td className="px-5 py-3 sm:px-6 font-medium text-zinc-900">{vatTu.ms}</td>
                <td className="px-5 py-3 sm:px-6">
                  <Select
                    value={loai}
                    onValueChange={(val) => setLoai(val as VatTu["loai"])}
                  >
                    <SelectTrigger className="w-full h-8 rounded border-zinc-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(loaiVatTuLabels).map((value) => (
                        <SelectItem key={value} value={value}>
                          {getLoaiVatTuLabel(value as VatTu["loai"])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-5 py-3 sm:px-6">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={kho}
                    onChange={(event) => setKho(event.target.value)}
                    required
                    className="w-full rounded border border-zinc-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-3 sm:px-6 text-zinc-500">
                  {vatTu.donGia === null ? "Chưa có giá" : formatPrice(Number(vatTu.donGia))}
                </td>
                <td className="px-3 py-3 sm:px-6 text-zinc-400">—</td>
                <td className="px-5 py-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <SaveButton onClick={() => void saveVatTu(vatTu.ms)} />
                    <CancelButton onClick={() => setEditingId(null)} />
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={vatTu.ms} className="border-t border-zinc-100">
                <td className="px-5 py-3 font-medium text-zinc-900 sm:px-6">{vatTu.ms}</td>
                <td className="px-5 py-3 sm:px-6">{getLoaiVatTuLabel(vatTu.loai)}</td>
                <td className="px-5 py-3 sm:px-6">{formatPrice(vatTu.kho)}</td>
                <td className="px-3 py-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span>{vatTu.donGia === null ? "Chưa có giá" : formatPrice(Number(vatTu.donGia))}</span>
                    <DropdownMenu
                      onOpenChange={(open) => {
                        if (open && !priceHistory[vatTu.ms]) {
                          void loadPriceHistory(vatTu.ms)
                        }
                      }}
                    >
                      <DropdownMenuTrigger
                        render={<SearchButton/>}
                        className="text-blue-700 hover:text-blue-900 cursor-pointer inline-flex items-center p-0.5"
                        title="Lịch sử giá"
                      />
                      <DropdownMenuContent align="start" className="w-64 p-3 bg-white shadow-lg border border-zinc-200 rounded-lg">
                        <p className="font-semibold text-xs text-zinc-700 mb-2">Lịch sử đơn giá</p>
                        {!(priceHistory[vatTu.ms]?.length) ? (
                          <p className="text-xs text-zinc-500 py-1">Chưa có lịch sử đơn giá</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {priceHistory[vatTu.ms].map((entry) => (
                              <div
                                key={entry.id}
                                className="flex justify-between items-center text-xs py-1 border-b border-zinc-100 last:border-none"
                              >
                                <span className="text-zinc-600">{formatDateTime(new Date(entry.ngay)).slice(0, 10)}</span>
                                <span className="font-medium text-zinc-900">{formatPrice(Number(entry.donGia))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={priceValues[vatTu.ms] ?? ""}
                      onChange={(event) =>
                        setPriceValues((prev) => ({ ...prev, [vatTu.ms]: event.target.value }))
                      }
                      placeholder="Giá mới"
                      className="w-24 rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                    <SaveButton onClick={() => void savePrice(vatTu.ms)} />
                  </div>
                </td>
                <td className="px-3 py-3 sm:px-6">
                  <div className="flex flex-row items-center justify-start gap-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={importValues[vatTu.ms] ?? ""}
                      onChange={(event) =>
                        setImportValues((prev) => ({ ...prev, [vatTu.ms]: event.target.value }))
                      }
                      placeholder="SL nhập"
                      className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <ImportButton onClick={() => void importVatTu(vatTu.ms)} />
                  </div>
                </td>
                <td className="px-5 py-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <EditButton onClick={() => startEdit(vatTu)} />
                    <DeleteButton onClick={() => void deleteVatTu(vatTu.ms)} />
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      {total > pageSize && (
        <div className="border-t border-zinc-100 p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Trước"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1) onPageChange(page - 1)
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-sm text-zinc-600">
                  Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Sau"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < Math.ceil(total / pageSize)) onPageChange(page + 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}


