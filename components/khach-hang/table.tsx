"use client"

import { use, useState } from "react"
import { updateCustomer as updateCustomerAction, deleteCustomer as deleteCustomerAction } from "@/lib/actions/khach-hang/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { CancelButton, DeleteButton, EditButton, SaveButton } from "@/components/buttons"
import { toast } from "@/components/ui/toast"
import { KhachHang, CustomerDraft } from "./form"

const columns: { key: keyof KhachHang; label: string }[] = [
  { key: "mskh", label: "Mã khách hàng" },
  { key: "ten", label: "Tên" },
  { key: "tenCongTy", label: "Tên công ty" },
  { key: "diaChi", label: "Địa chỉ" },
  { key: "tinh", label: "Tỉnh" },
  { key: "maSoThue", label: "Mã số thuế" },
  { key: "soDienThoai", label: "Số điện thoại" },
  { key: "diaChiGiaoHang", label: "Địa chỉ giao hàng" },
  { key: "sdtChanh", label: "Số điện thoại chành" },
]

export default function KhachHangTable({
  dataPromise,
  page,
  onPageChange,
  onReload,
}: {
  dataPromise: Promise<{ items: KhachHang[]; total: number }>
  page: number
  onPageChange: (newPage: number) => void
  onReload: () => void
}) {
  const { items, total } = use(dataPromise)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMskh, setEditMskh] = useState("")
  const [draft, setDraft] = useState<CustomerDraft>({
    ten: "",
    tenCongTy: "",
    diaChi: "",
    tinh: "",
    email: "",
    maSoThue: "",
    soDienThoai: "",
    diaChiGiaoHang: "",
    sdtChanh: "",
  })

  const pageCount = Math.max(1, Math.ceil(total / 10))

  function startEdit(customer: KhachHang) {
    setEditingId(customer.mskh)
    setEditMskh(customer.mskh)
    setDraft({
      ten: customer.ten,
      tenCongTy: customer.tenCongTy ?? "",
      diaChi: customer.diaChi,
      tinh: customer.tinh,
      email: customer.email ?? "",
      maSoThue: customer.maSoThue ?? "",
      soDienThoai: customer.soDienThoai ?? "",
      diaChiGiaoHang: customer.diaChiGiaoHang ?? "",
      sdtChanh: customer.sdtChanh ?? "",
    })
  }

  async function saveCustomer(id: string) {
    const result = (await updateCustomerAction(id, { mskh: editMskh, ...draft })) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật khách hàng")
      setEditingId(null)
      onReload()
    }
  }

  async function deleteCustomer(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa khách hàng này?")) return
    const result = (await deleteCustomerAction(id)) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã xóa khách hàng")
      onReload()
    }
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

  return (
    <>
      <table className="w-full min-w-275 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 sm:px-6 font-semibold">
                {column.label}
              </th>
            ))}
            <th className="px-3 py-2 sm:px-6 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((customer) =>
            editingId === customer.mskh ? (
              <tr key={customer.mskh} className="border-t border-zinc-100">
                <td className="px-3 py-2 sm:px-6">
                  <input
                    value={editMskh}
                    onChange={(event) => setEditMskh(event.target.value)}
                    required
                    className="w-full min-w-24 rounded border border-zinc-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2 sm:px-6">{editInput("ten", true)}</td>
                <td className="px-3 py-2 sm:px-6">{editInput("tenCongTy")}</td>
                <td className="px-3 py-2 sm:px-6">{editInput("diaChi")}</td>
                <td className="px-3 py-2 sm:px-6">{editInput("tinh")}</td>
                <td className="px-3 py-2 sm:px-6">{editInput("maSoThue")}</td>
                <td className="px-3 py-2 sm:px-6">{editInput("soDienThoai")}</td>
                <td className="px-3 py-2 sm:px-6">{editInput("diaChiGiaoHang")}</td>
                <td className="px-3 py-2 sm:px-6">{editInput("sdtChanh")}</td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <SaveButton onClick={() => void saveCustomer(customer.mskh)} />
                    <CancelButton onClick={() => setEditingId(null)} />
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={customer.mskh} className="border-t border-zinc-100">
                <td className="px-3 py-2 sm:px-6 font-medium text-zinc-900">{customer.mskh}</td>
                <td className="px-3 py-2 sm:px-6">{customer.ten}</td>
                <td className="px-3 py-2 sm:px-6">{customer.tenCongTy ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{customer.diaChi ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{customer.tinh ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{customer.maSoThue ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{customer.soDienThoai ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{customer.diaChiGiaoHang ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">{customer.sdtChanh ?? "—"}</td>
                <td className="px-3 py-2 sm:px-6">
                  <div className="flex items-center gap-2">
                    <EditButton onClick={() => startEdit(customer)} />
                    <DeleteButton onClick={() => void deleteCustomer(customer.mskh)} />
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
