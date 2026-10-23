"use client"

import { Suspense, useRef, useState } from "react"
import { listSanXuat } from "@/lib/actions/san-xuat/data"
import SanXuatForm, { Customer } from "./form"
import SanXuatTable, { SanXuatItem } from "./table"
import SanXuatSkeleton from "./skeleton"

export type { Customer } from "./form"
export type { SanXuatItem } from "./table"

export default function SanXuatManager({
  customers,
  initialSanXuat,
  initialTotal,
  initialDataPromise,
}: {
  customers: Customer[]
  initialSanXuat?: SanXuatItem[]
  initialTotal?: number
  initialDataPromise?: Promise<{ items: SanXuatItem[]; total: number }>
}) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "" })
  const [dataPromise, setDataPromise] = useState<Promise<{ items: SanXuatItem[]; total: number }>>(
    () =>
      initialDataPromise ??
      (initialSanXuat !== undefined
        ? Promise.resolve({
            items: initialSanXuat,
            total: initialTotal ?? initialSanXuat.length,
          })
        : (listSanXuat("", 1, 10) as Promise<{ items: SanXuatItem[]; total: number }>)),
  )
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(search: string) {
    setFilters({ search })
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(listSanXuat(search, 1, 10) as Promise<{ items: SanXuatItem[]; total: number }>)
    }, 400)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setDataPromise(
      listSanXuat(filters.search, newPage, 10) as Promise<{ items: SanXuatItem[]; total: number }>,
    )
  }

  function handleReload() {
    setDataPromise(
      listSanXuat(filters.search, page, 10) as Promise<{ items: SanXuatItem[]; total: number }>,
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <SanXuatForm
          customers={customers}
          onSuccess={handleReload}
        />

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">
              Lịch sử sản xuất
            </h2>
            <input
              value={filters.search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Lọc theo khách hàng hoặc mã sản phẩm"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"
            />
          </div>

          <Suspense fallback={<SanXuatSkeleton />}>
            <SanXuatTable
              dataPromise={dataPromise}
              page={page}
              onPageChange={handlePageChange}
            />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
