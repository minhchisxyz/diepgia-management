"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { listCustomers, createCustomer as createCustomerAction, updateCustomer as updateCustomerAction, deleteCustomer as deleteCustomerAction } from "@/app/actions/khach-hang/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import {CancelButton, DeleteButton, EditButton, SaveButton} from "@/components/buttons";

type KhachHang = {
  mskh: string
  ten: string
  tenCongTy: string | null
  diaChi: string
  tinh: string
  email: string | null
  maSoThue: string | null
  soDienThoai: string | null
  diaChiGiaoHang: string | null
  sdtChanh: string | null
}

type CustomerDraft = Omit<KhachHang, "mskh">
const emptyDraft: CustomerDraft = {
  ten: "",
  tenCongTy: "",
  diaChi: "",
  tinh: "",
  email: "",
  maSoThue: "",
  soDienThoai: "",
  diaChiGiaoHang: "",
  sdtChanh: "",
}

export default function KhachHangManager() {
  const [mskh, setMskh] = useState("")
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft)
  const [khachHangs, setKhachHangs] = useState<KhachHang[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMskh, setEditMskh] = useState("")
  const [filters, setFilters] = useState({ search: "" })
  const [message, setMessage] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    const search = filters.search
    const result = await listCustomers(search, page, 10)
    setKhachHangs(result.items as KhachHang[])
    setTotal(result.total)
  }

  useEffect(() => {
    let active = true
    listCustomers("", 1, 10)
      .then((result) => {
        if (active) {
          setKhachHangs(result.items as KhachHang[])
          setTotal(result.total)
        }
      })
      .catch(() => {
        if (active) setMessage("Không thể tải danh sách khách hàng")
      })
    return () => {
      active = false
    }
  }, [])


  const pageCount = Math.max(1, Math.ceil(total / 10))



  async function createKhachHang(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    const result = await createCustomerAction({ mskh, ...draft }) as { error?: string }
    if (result.error) {
      setMessage(result.error ?? "Không thể tạo khách hàng")
      return
    }
    setMskh("")
    setDraft(emptyDraft)
    setMessage("Đã tạo khách hàng")
    await load()
  }

  async function saveCustomer(id: string) {
    const result = await updateCustomerAction(id, { mskh: editMskh, ...draft }) as { error?: string }
    setMessage(result.error ? result.error : "Đã cập nhật khách hàng")
    if (!result.error) {
      setEditingId(null)
      await load()
    }
  }

  async function deleteCustomer(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa khách hàng này?")) return
    const result = await deleteCustomerAction(id) as { error?: string }
    setMessage(result.error ? result.error : "Đã xóa khách hàng")
    if (!result.error) await load()
  }

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

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Khách hàng</h1>
          <form onSubmit={createKhachHang} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã khách hàng (*)
              <input value={mskh}
                     onChange={(event) => setMskh(event.target.value)}
                     placeholder="Nhập mã khách hàng"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên khách hàng (*)
              <input value={draft.ten}
                     onChange={(event) => setDraft({...draft, ten: event.target.value})}
                     placeholder="Nhập tên khách hàng"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tên công ty
              <input value={draft.tenCongTy ?? ""}
                     onChange={(event) => setDraft({...draft, tenCongTy: event.target.value})}
                     placeholder="Nhập tên công ty"
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Địa chỉ (*)
              <input value={draft.diaChi}
                     onChange={(event) => setDraft({...draft, diaChi: event.target.value})}
                     placeholder="Nhập địa chỉ"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Tỉnh (*)
              <input value={draft.tinh}
                     onChange={(event) => setDraft({...draft, tinh: event.target.value})}
                     placeholder="Nhập tỉnh"
                     required
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Số điện thoại
              <input value={draft.soDienThoai ?? ""}
                     onChange={(event) => setDraft({...draft, soDienThoai: event.target.value})}
                     placeholder="Nhập số điện thoại"
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Mã số thuế
              <input value={draft.maSoThue ?? ""}
                     onChange={(event) => setDraft({...draft, maSoThue: event.target.value})}
                     placeholder="Nhập mã số thuế"
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">Email
              <input type="email"
                     value={draft.email ?? ""}
                     onChange={(event) => setDraft({...draft, email: event.target.value})}
                     placeholder="Nhập email"
                     className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"/>
            </label>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 lg:col-span-4">Tạo khách hàng</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách khách hàng</h2>
            <input value={filters.search} onChange={(event) => {
              const search = event.target.value
              setFilters({ search })
              if (searchTimer.current) clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => {
                setPage(1)
                void listCustomers(search, 1, 10).then((result) => {
                  setKhachHangs(result.items as KhachHang[])
                  setTotal(result.total)
                })
              }, 500)
            }} placeholder="Tìm mã, tên khách hàng hoặc tên công ty" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md" />
          </div>
          <table className="w-full min-w-275 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>
                {columns.map((column) => <th key={column.key}
                                             className="px-3 py-2 sm:px-6 font-semibold">
                  {column.label}
                </th>)}
                <th className="px-3 py-3 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {khachHangs.map((customer) => editingId === customer.mskh ? (
                <tr key={customer.mskh} className="border-t border-zinc-100">
                  <td className="px-3 py-2 sm:px-6">
                    <input value={editMskh}
                           onChange={(event) => setEditMskh(event.target.value)}
                           required
                           className="w-full min-w-28 rounded border border-zinc-300 px-2 py-1"/>
                  </td>
                  <td className="px-3 py-2 sm:px-6">{editInput("ten", true)}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("tenCongTy")}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("diaChi", true)}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("tinh", true)}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("maSoThue")}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("soDienThoai")}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("diaChiGiaoHang")}</td>
                  <td className="px-3 py-2 sm:px-6">{editInput("sdtChanh")}</td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex gap-2">
                      <SaveButton onClick={() => void saveCustomer(customer.mskh)}/>
                      <CancelButton onClick={() => setEditingId(null)}/>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={customer.mskh} className="border-t border-zinc-100">
                  <td className="px-3 py-2 sm:px-6">{customer.mskh}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.ten}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.tenCongTy ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.diaChi}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.tinh}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.maSoThue ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.soDienThoai ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.diaChiGiaoHang ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">{customer.sdtChanh ?? "—"}</td>
                  <td className="px-3 py-2 sm:px-6">
                    <div className="flex gap-3">
                      <EditButton onClick={() => startEdit(customer)}/>
                      <DeleteButton onClick={() => void deleteCustomer(customer.mskh)}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination className="p-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious text="Trước"
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const next = Math.max(1, page - 1);
                                      setPage(next);
                                      void listCustomers(filters.search, next, 10).then((r) => {
                                        setKhachHangs(r.items as KhachHang[]);
                                        setTotal(r.total)
                                      })
                                    }}/>
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm">{page} / {pageCount}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext text="Sau"
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const next = Math.min(pageCount, page + 1);
                                  setPage(next);
                                  void listCustomers(filters.search, next, 10).then((r) => {
                                    setKhachHangs(r.items as KhachHang[]);
                                    setTotal(r.total)
                                  })
                                }}/>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </div>
    </main>
  )
}
