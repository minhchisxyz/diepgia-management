"use client"

import { use, useMemo, useState } from "react"
import {
  updateIngredient,
  deleteIngredient as deleteIngredientAction,
  saveIngredientPrice,
  listIngredientPrices,
  importIngredient as importIngredientAction,
} from "@/lib/actions/nguyen-lieu/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { formatDateTime, formatPrice } from "@/lib/utils"
import {CancelButton, DeleteButton, EditButton, ImportButton, SaveButton, SearchButton} from "@/components/buttons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import { Ingredient } from "./form"

type Price = { id: string; ngay: string; donGia: string }
type SortKey = "ten" | "kho"

export default function NguyenLieuTable({
  dataPromise,
  page,
  onPageChange,
  onReload,
}: {
  dataPromise: Promise<{ items: Ingredient[]; total: number }>
  page: number
  onPageChange: (newPage: number) => void
  onReload: () => void
}) {
  const { items, total } = use(dataPromise)

  const [ten, setTen] = useState("")
  const [donVi, setDonVi] = useState("")
  const [loai, setLoai] = useState("")
  const [kho, setKho] = useState("0")
  const [importValues, setImportValues] = useState<Record<string, string>>({})
  const [priceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [priceValues, setPriceValues] = useState<Record<string, string>>({})
  const [priceHistory, setPriceHistory] = useState<Record<string, Price[]>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "ten", direction: "asc" })

  const pageCount = Math.max(1, Math.ceil(total / 10))

  const sortedIngredients = useMemo(() => {
    return [...items].sort((a, b) => {
      const left = a[sort.key]
      const right = b[sort.key]
      const comparison = typeof left === "number" ? left - (right as number) : String(left).localeCompare(String(right), "vi")
      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [items, sort])

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

  function startEdit(item: Ingredient) {
    setEditingId(item.id)
    setTen(item.ten)
    setDonVi(item.donVi)
    setLoai(item.loai)
    setKho(String(item.kho))
  }

  async function saveIngredient(id: string) {
    const result = (await updateIngredient(id, { ten, donVi, loai, kho: Number(kho) })) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật nguyên liệu")
      setEditingId(null)
      onReload()
    }
  }

  async function deleteIngredient(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa nguyên liệu này?")) return
    const result = (await deleteIngredientAction(id)) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã xóa nguyên liệu")
      onReload()
    }
  }

  async function savePrice(id: string) {
    const priceInput = priceValues[id]
    const donGia = Number(priceInput)
    if (!priceInput || isNaN(donGia) || donGia < 0) {
      toast.error("Vui lòng nhập đơn giá hợp lệ không âm")
      return
    }

    const result = (await saveIngredientPrice(id, priceDate, donGia)) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật đơn giá")
      setPriceValues((prev) => ({ ...prev, [id]: "" }))
      onReload()
      await loadPriceHistory(id)
    }
  }

  async function loadPriceHistory(id: string) {
    const prices = await listIngredientPrices(id)
    setPriceHistory((current) => ({ ...current, [id]: prices as unknown as Price[] }))
  }

  async function importIngredient(id: string) {
    const qtyInput = importValues[id]
    const soLuong = Number(qtyInput)
    if (!qtyInput || isNaN(soLuong) || soLuong <= 0) {
      toast.error("Số lượng nhập phải là số lớn hơn 0")
      return
    }

    const result = (await importIngredientAction(id, soLuong)) as { error?: string }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã nhập hàng")
      setImportValues((prev) => ({ ...prev, [id]: "" }))
      onReload()
    }
  }

  const columns: { key: SortKey | "donVi" | "loai"; label: string }[] = [
    { key: "ten", label: "Tên" },
    { key: "donVi", label: "Đơn vị" },
    { key: "loai", label: "Loại" },
    { key: "kho", label: "Kho" },
  ]

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 sm:px-6">
                {column.key === "ten" || column.key === "kho" ? (
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
            <th className="px-3 py-2 sm:px-6 font-semibold">Đơn giá</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Nhập hàng</th>
            <th className="px-3 py-2 sm:px-6 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sortedIngredients.map((item) =>
            editingId === item.id ? (
              <tr key={item.id} className="border-t border-zinc-100 bg-zinc-50">
                <td className="px-3 py-2 sm:px-6">
                  <input
                    value={ten}
                    onChange={(event) => setTen(event.target.value)}
                    required
                    className="rounded border border-zinc-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <input
                    value={donVi}
                    onChange={(event) => setDonVi(event.target.value)}
                    required
                    className="rounded border border-zinc-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <input
                    value={loai}
                    onChange={(event) => setLoai(event.target.value)}
                    required
                    className="rounded border border-zinc-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={kho}
                    onChange={(event) => setKho(event.target.value)}
                    required
                    className="rounded border border-zinc-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2 sm:px-6 text-zinc-500">
                  {item.donGia === null ? "Chưa có giá" : formatPrice(item.donGia)}
                </td>
                <td className="px-3 py-2 sm:px-6 text-zinc-400">—</td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <SaveButton onClick={() => void saveIngredient(item.id)} />
                    <CancelButton onClick={() => setEditingId(null)} />
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={item.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-medium text-zinc-900 sm:px-6">{item.ten}</td>
                <td className="px-3 py-2 sm:px-6">{item.donVi}</td>
                <td className="px-3 py-2 sm:px-6">{item.loai}</td>
                <td className="px-3 py-2 sm:px-6">{formatPrice(item.kho)}</td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span>{item.donGia === null ? "Chưa có giá" : formatPrice(item.donGia)}</span>
                    <DropdownMenu
                      onOpenChange={(open) => {
                        if (open && !priceHistory[item.id]) {
                          void loadPriceHistory(item.id)
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
                        {!(priceHistory[item.id]?.length) ? (
                          <p className="text-xs text-zinc-500 py-1">Chưa có lịch sử đơn giá</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {priceHistory[item.id].map((entry) => (
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
                      step="0.001"
                      value={priceValues[item.id] ?? ""}
                      onChange={(event) =>
                        setPriceValues((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      placeholder="Giá mới"
                      className="w-24 rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                    <SaveButton onClick={() => void savePrice(item.id)} />
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex flex-row items-center justify-start gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={importValues[item.id] ?? ""}
                      onChange={(event) =>
                        setImportValues((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      placeholder="SL nhập"
                      className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <ImportButton onClick={() => void importIngredient(item.id)} />
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <EditButton onClick={() => startEdit(item)} />
                    <DeleteButton onClick={() => void deleteIngredient(item.id)} />
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      {pageCount > 1 && (
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
                  Trang {page} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Sau"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < pageCount) onPageChange(page + 1)
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
