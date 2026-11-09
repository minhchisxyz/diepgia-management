"use client"

import { use, useState } from "react"
import {
  updateIngredient,
  deleteIngredient as deleteIngredientAction,
  saveIngredientPrice,
  listIngredientPrices,
  importIngredient as importIngredientAction,
} from "@/lib/actions/nguyen-lieu/data"
import { TablePagination } from "@/components/ui/pagination"
import { formatDateTime, formatPrice, parsePrice } from "@/lib/utils"
import { PriceInput } from "@/components/ui/price-input"
import {CancelButton, DeleteButton, EditButton, ImportButton, SaveButton, SearchButton} from "@/components/buttons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import { Ingredient } from "./form"

type Price = { id: string; ngay: string; donGia: string }
export type SortKey = "ten" | "kho"

export default function NguyenLieuTable({
  dataPromise,
  page,
  sort,
  onSortChangeAction,
  onPageChangeAction,
  onReloadAction,
}: {
  dataPromise: Promise<{ items: Ingredient[]; total: number }>
  page: number
  sort: { key: SortKey; direction: "asc" | "desc" }
  onSortChangeAction: (sort: { key: SortKey; direction: "asc" | "desc" }) => void
  onPageChangeAction: (newPage: number) => void
  onReloadAction: () => void
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
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)

  function toggleSort(key: SortKey) {
    onSortChangeAction(
      sort.key === key
        ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
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
    const label = `${ten}`
    setSavingId(id)
    try {
      const result = (await toast.promise(
        updateIngredient(id, { ten, donVi, loai, kho: Number(kho) }) as Promise<{ error?: string }>,
        {
          loading: `Đang cập nhật thông tin nguyên liệu ${label}...`,
          success: `Cập nhật thông tin nguyên liệu ${label} thành công`,
          error: (err) => `Cập nhật thông tin nguyên liệu ${label} thất bại: ${err}`,
        }
      ))
      if (!result?.error) {
        setEditingId(null)
        onReloadAction()
      }
    } finally {
      setSavingId(null)
    }
  }

  async function deleteIngredient(id: string) {
    const item = items.find((i) => i.id === id)
    const label = `${item?.ten ?? id}`
    if (!window.confirm(`Bạn có chắc muốn xóa nguyên liệu ${label}?`)) return
    setDeletingId(id)
    try {
      const result = (await toast.promise(
        deleteIngredientAction(id) as Promise<{ error?: string }>,
        {
          loading: `Đang xóa nguyên liệu ${label}...`,
          success: `Xóa nguyên liệu ${label} thành công`,
          error: (err) => `Xóa nguyên liệu ${label} thất bại: ${err}`,
        }
      ))
      if (!result?.error) {
        onReloadAction()
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function savePrice(id: string) {
    const priceInput = priceValues[id]
    const donGia = parsePrice(priceInput)
    if (!priceInput || isNaN(donGia) || donGia < 0) {
      toast.error("Vui lòng nhập đơn giá hợp lệ không âm")
      return
    }

    const item = items.find((i) => i.id === id)
    const label = `${item?.ten ?? id}`
    setSavingPriceId(id)
    try {
      const result = (await toast.promise(
        saveIngredientPrice(id, priceDate, donGia) as Promise<{ error?: string }>,
        {
          loading: `Đang cập nhật đơn giá cho nguyên liệu ${label}...`,
          success: `Cập nhật đơn giá cho nguyên liệu ${label} thành công`,
          error: (err) => `Cập nhật đơn giá cho nguyên liệu ${label} thất bại: ${err}`,
        }
      ))
      if (!result?.error) {
        setPriceValues((prev) => ({ ...prev, [id]: "" }))
        onReloadAction()
        await loadPriceHistory(id)
      }
    } finally {
      setSavingPriceId(null)
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

    const item = items.find((i) => i.id === id)
    const label = `${item?.ten ?? id} (${formatPrice(soLuong)} ${item?.donVi ?? ""})`
    setImportingId(id)
    try {
      const result = (await toast.promise(
        importIngredientAction(id, soLuong) as Promise<{ error?: string }>,
        {
          loading: `Đang nhập kho nguyên liệu ${label}...`,
          success: `Nhập kho nguyên liệu ${label} thành công`,
          error: (err) => `Nhập kho nguyên liệu ${label} thất bại: ${err}`,
        }
      ))
      if (!result?.error) {
        setImportValues((prev) => ({ ...prev, [id]: "" }))
        onReloadAction()
      }
    } finally {
      setImportingId(null)
    }
  }

  const columns: { key: SortKey | "donVi" | "loai"; label: string }[] = [
    { key: "ten", label: "Tên" },
    { key: "donVi", label: "Đơn vị" },
    { key: "loai", label: "Loại" },
    { key: "kho", label: "Kho" },
  ]

  return (
    <div className={`max-h-120 overflow-y-auto`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-100 text-zinc-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 sm:px-6 sticky top-0 z-10 bg-zinc-100">
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
            <th className="px-3 py-2 sm:px-6 font-semibold sticky top-0 z-10 bg-zinc-100">Đơn giá</th>
            <th className="px-3 py-2 sm:px-6 font-semibold sticky top-0 z-10 bg-zinc-100">Nhập hàng</th>
            <th className="px-3 py-2 sm:px-6 font-semibold sticky top-0 z-10 bg-zinc-100">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
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
                    <SaveButton
                      onClick={() => void saveIngredient(item.id)}
                      loading={savingId === item.id}
                    />
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
                    <PriceInput
                      value={priceValues[item.id] ?? ""}
                      onChange={(event) =>
                        setPriceValues((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      placeholder="Giá mới"
                      className="w-24 rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                    <SaveButton
                      onClick={() => void savePrice(item.id)}
                      loading={savingPriceId === item.id}
                    />
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
                    <ImportButton
                      onClick={() => void importIngredient(item.id)}
                      loading={importingId === item.id}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <EditButton onClick={() => startEdit(item)} />
                    <DeleteButton
                      onClick={() => void deleteIngredient(item.id)}
                      loading={deletingId === item.id}
                    />
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      <TablePagination page={page} total={total} onPageChangeAction={onPageChangeAction} />
    </div>
  )
}
