"use client"

import { use, useState } from "react"
import { ThuTienRow, ThuTienSortKey, exportThuTienExcel } from "@/lib/actions/cong-no/data"
import { downloadFile, formatDateTime, formatPrice, formatSoPhieu } from "@/lib/utils"
import { TablePagination } from "@/components/ui/pagination"
import { ExcelButton } from "@/components/buttons"
import { toast } from "@/components/ui/toast"

export type { ThuTienSortKey }

export default function ThuTienTable({
  dataPromise,
  page = 1,
  sort = { key: "soPhieu", direction: "desc" },
  onSortChangeAction,
  onPageChangeAction,
}: {
  dataPromise: Promise<{ items: ThuTienRow[]; total: number; totalSoTien?: number; error?: string }>
  page?: number
  sort?: { key: ThuTienSortKey; direction: "asc" | "desc" }
  onSortChangeAction?: (sort: { key: ThuTienSortKey; direction: "asc" | "desc" }) => void
  onPageChangeAction?: (newPage: number) => void
}) {
  const { items, total } = use(dataPromise)
  const [exportingSoPhieu, setExportingSoPhieu] = useState<number | null>(null)

  function toggleSort(key: ThuTienSortKey) {
    onSortChangeAction?.(
      sort.key === key
        ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    )
  }

  function sortLabel(key: ThuTienSortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ⇅"
  }

  function handleThuTienExport(soPhieu: number) {
    const label = `TN26${formatSoPhieu(soPhieu)}`
    setExportingSoPhieu(soPhieu)

    const promise = exportThuTienExcel(soPhieu)
      .then((result) => {
        if ("data" in result && result.data && "fileName" in result && result.fileName) {
          downloadFile(result.data, result.fileName)
        }
        return result
      })
      .finally(() => {
        setExportingSoPhieu(null)
      })

    toast.promise(promise, {
      loading: `Đang tạo phiếu thu ${label}...`,
      success: `Tạo phiếu thu ${label} thành công`,
      error: (err) => `Xuất file Excel thất bại: ${err?.message || err}`,
    })
  }

  return (
    <div className="max-h-120 overflow-y-auto">
      <table className="w-full min-w-260 text-left text-sm">
        <thead className="bg-zinc-100 text-zinc-600">
          <tr>
            <th className="px-3 py-2 sm:px-6 sticky top-0 z-10 bg-zinc-100">
              <button
                type="button"
                onClick={() => toggleSort("ngayThu")}
                className="font-semibold hover:text-zinc-900 whitespace-nowrap cursor-pointer select-none"
              >
                Ngày thu{sortLabel("ngayThu")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6 sticky top-0 z-10 bg-zinc-100">
              <button
                type="button"
                onClick={() => toggleSort("soPhieu")}
                className="font-semibold hover:text-zinc-900 whitespace-nowrap cursor-pointer select-none"
              >
                Số phiếu{sortLabel("soPhieu")}
              </button>
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap sticky top-0 z-10 bg-zinc-100">
              Mã KH
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap sticky top-0 z-10 bg-zinc-100">
              Tên khách hàng
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap sticky top-0 z-10 bg-zinc-100">
              Tên công ty
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap sticky top-0 z-10 bg-zinc-100">
              Số tiền
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap sticky top-0 z-10 bg-zinc-100">
              Nơi nhận
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap sticky top-0 z-10 bg-zinc-100">
              Lý do
            </th>
            <th className="px-3 py-2 sm:px-6 font-semibold whitespace-nowrap sticky top-0 z-10 bg-zinc-100">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-zinc-500 sm:px-6">
                Không có phiếu thu tiền nào
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.soPhieu} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  {formatDateTime(new Date(item.ngayThu))}
                </td>
                <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">
                  {`TN26${formatSoPhieu(item.soPhieu)}`}
                </td>
                <td className="px-3 py-2 sm:px-6 font-mono text-xs text-zinc-700">
                  {item.mskh}
                </td>
                <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">
                  {item.tenKhachHang}
                </td>
                <td className="px-3 py-2 sm:px-6 text-zinc-600">
                  {item.tenCongTy ?? "—"}
                </td>
                <td className="px-3 py-2 sm:px-6 font-semibold text-emerald-700 whitespace-nowrap">
                  {formatPrice(item.soTien)} đ
                </td>
                <td className="px-3 py-2 sm:px-6 text-zinc-700">
                  {item.noiNhan || "—"}
                </td>
                <td className="px-3 py-2 sm:px-6 text-zinc-700">
                  {item.lyDo || "—"}
                </td>
                <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                  <ExcelButton
                    onClick={() => handleThuTienExport(item.soPhieu)}
                    loading={exportingSoPhieu === item.soPhieu}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <TablePagination page={page} total={total} onPageChangeAction={onPageChangeAction} />
    </div>
  )
}
