"use client"

import { Suspense, useRef, useState } from "react"
import { listXuatHang } from "@/lib/actions/xuat-hang/data"
import XuatHangForm, { Customer, Product } from "./form"
import XuatHangTable, { DeliveryItem } from "./table"
import XuatHangSkeleton from "./skeleton"

export type { Customer, Product } from "./form"
export type { DeliveryItem } from "./table"

export default function XuatHangManager({
  customers,
  initialProducts = [],
  initialDeliveries,
  initialTotal,
  initialDataPromise,
}: {
  customers: Customer[]
  initialProducts?: Product[]
  initialDeliveries?: DeliveryItem[]
  initialTotal?: number
  initialDataPromise?: Promise<{ items: DeliveryItem[]; total: number }>
}) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "" })
  const [dataPromise, setDataPromise] = useState<Promise<{ items: DeliveryItem[]; total: number }>>(
    () =>
      initialDataPromise ??
      (initialDeliveries !== undefined
        ? Promise.resolve({ items: initialDeliveries, total: initialTotal ?? initialDeliveries.length })
        : (listXuatHang("") as Promise<{ items: DeliveryItem[]; total: number }>)),
  )
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(search: string) {
    setFilters({ search })
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(listXuatHang(search) as Promise<{ items: DeliveryItem[]; total: number }>)
    }, 200)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
  }

  function handleReload() {
    setDataPromise(listXuatHang(filters.search) as Promise<{ items: DeliveryItem[]; total: number }>)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <XuatHangForm
          customers={customers}
          initialProducts={initialProducts}
          onSuccess={handleReload}
        />

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">
              Lịch sử xuất hàng
            </h2>
            <input
              value={filters.search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Lọc theo mã khách hàng"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"
            />
          </div>

          <Suspense fallback={<XuatHangSkeleton />}>
            <XuatHangTable
              dataPromise={dataPromise}
              page={page}
              onPageChangeAction={handlePageChange}
            />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
