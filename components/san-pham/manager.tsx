"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { listCustomers } from "@/lib/actions/khach-hang/data"
import { listIngredients } from "@/lib/actions/nguyen-lieu/data"
import { listVatTu } from "@/lib/actions/vat-tu/data"
import { listProducts } from "@/lib/actions/san-pham/data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import SanPhamForm, { Customer, Ingredient, VatTu, Product } from "./form"
import SanPhamTable from "./table"
import SanPhamSkeleton from "./skeleton"

export default function SanPhamManager({
  initialDataPromise,
}: {
  initialDataPromise?: Promise<{ items: Product[]; total: number }>
}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [vatTus, setVatTus] = useState<VatTu[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [filters, setFilters] = useState({ search: "" })
  const [page, setPage] = useState(1)

  const [dataPromise, setDataPromise] = useState<Promise<{ items: Product[]; total: number }>>(
    () =>
      initialDataPromise ??
      (listProducts("") as Promise<{
        items: Product[]
        total: number
      }>),
  )

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void listCustomers("", 1, 1000).then((res) => setCustomers(res.items))
    void listIngredients("", 1, 1000).then((res) => setIngredients(res.items))
    void listVatTu("", 1, 1000).then((res) => setVatTus(res.items))
  }, [])

  function triggerFilter(search: string, customer: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(
        listProducts(search, undefined, undefined, customer || undefined) as Promise<{ items: Product[]; total: number }>,
      )
    }, 200)
  }

  function handleSearch(search: string) {
    setFilters({ search })
    triggerFilter(search, selectedCustomer)
  }

  function handleCustomerChange(customer: string) {
    setSelectedCustomer(customer)
    triggerFilter(filters.search, customer)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
  }

  function handleReload() {
    setDataPromise(
      listProducts(filters.search, undefined, undefined, selectedCustomer || undefined) as Promise<{ items: Product[]; total: number }>,
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Sản phẩm</h1>
          <SanPhamForm
            customers={customers}
            ingredients={ingredients}
            vatTus={vatTus}
            onSuccess={handleReload}
          />
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900 whitespace-nowrap">
              Danh sách sản phẩm
            </h2>
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Select
                value={selectedCustomer || "ALL"}
                onValueChange={(val) => handleCustomerChange(val === "ALL" ? "" : (val ?? ""))}
              >
                <SelectTrigger className="w-full sm:max-w-xs h-10 border-zinc-300 bg-white">
                  <SelectValue placeholder="Tất cả khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả khách hàng</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.mskh} value={customer.mskh}>
                      {customer.mskh} - {customer.ten}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                value={filters.search}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Tìm mã sản phẩm"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"
              />
            </div>
          </div>

          <Suspense fallback={<SanPhamSkeleton />}>
            <SanPhamTable
              dataPromise={dataPromise}
              customers={customers}
              ingredients={ingredients}
              vatTus={vatTus}
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
