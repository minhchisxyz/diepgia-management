"use client"

import { Suspense, useRef, useState } from "react"
import { listCustomers } from "@/lib/actions/khach-hang/data"
import KhachHangForm, { KhachHang } from "./form"
import KhachHangTable from "./table"
import KhachHangSkeleton from "./skeleton"

export default function KhachHangManager({
  initialDataPromise,
}: {
  initialDataPromise?: Promise<{ items: KhachHang[]; total: number }>
}) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "" })
  const [dataPromise, setDataPromise] = useState<Promise<{ items: KhachHang[]; total: number }>>(
    () => initialDataPromise ?? (listCustomers("", 1, 10) as Promise<{ items: KhachHang[]; total: number }>),
  )
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(search: string) {
    setFilters({ search })
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(listCustomers(search, 1, 10) as Promise<{ items: KhachHang[]; total: number }>)
    }, 400)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setDataPromise(listCustomers(filters.search, newPage, 10) as Promise<{ items: KhachHang[]; total: number }>)
  }

  function handleReload() {
    setDataPromise(listCustomers(filters.search, page, 10) as Promise<{ items: KhachHang[]; total: number }>)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Khách hàng</h1>
          <KhachHangForm onSuccess={handleReload} />
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách khách hàng</h2>
            <input
              value={filters.search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Tìm mã, tên khách hàng hoặc tên công ty"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"
            />
          </div>
          <Suspense fallback={<KhachHangSkeleton />}>
            <KhachHangTable
              dataPromise={dataPromise}
              page={page}
              onPageChange={handlePageChange}
              onReload={handleReload}
            />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
