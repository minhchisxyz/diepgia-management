"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { listXuatHang } from "@/lib/actions/xuat-hang/data"
import XuatHangForm, { Customer, Product } from "./form"
import XuatHangTable, { DeliveryItem } from "./table"
import XuatHangSkeleton from "./skeleton"

export type { Customer, Product } from "./form"
export type { DeliveryItem } from "./table"

export default function XuatHangManager({
  customers: initialCustomers = [],
  customersPromise,
  initialProducts = [],
  initialDeliveries,
  initialTotal,
  initialDataPromise,
  isAdmin,
}: {
  customers?: Customer[]
  customersPromise?: Promise<Customer[]>
  initialProducts?: Product[]
  initialDeliveries?: DeliveryItem[]
  initialTotal?: number
  initialDataPromise?: Promise<{ items: DeliveryItem[]; total: number; isAdmin?: boolean }>
  isAdmin?: boolean
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "" })
  const [dataPromise, setDataPromise] = useState<Promise<{ items: DeliveryItem[]; total: number; isAdmin?: boolean }>>(
    () =>
      initialDataPromise ??
      (initialDeliveries !== undefined
        ? Promise.resolve({ items: initialDeliveries, total: initialTotal ?? initialDeliveries.length, isAdmin })
        : (listXuatHang("", 1, 10) as Promise<{ items: DeliveryItem[]; total: number; isAdmin?: boolean }>)),
  )
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    if (customersPromise) {
      customersPromise.then((items) => {
        if (active) setCustomers(items)
      })
    }
    return () => {
      active = false
    }
  }, [customersPromise])

  function handleSearch(search: string) {
    setFilters({ search })
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(listXuatHang(search, 1, 10) as Promise<{ items: DeliveryItem[]; total: number; isAdmin?: boolean }>)
    }, 200)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setDataPromise(listXuatHang(filters.search, newPage, 10) as Promise<{ items: DeliveryItem[]; total: number; isAdmin?: boolean }>)
  }

  function handleReload() {
    setDataPromise(listXuatHang(filters.search, page, 10) as Promise<{ items: DeliveryItem[]; total: number; isAdmin?: boolean }>)
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
              isAdmin={isAdmin}
            />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
