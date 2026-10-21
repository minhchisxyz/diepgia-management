"use client"

import { Suspense, useRef, useState } from "react"
import { listVatTu } from "@/lib/actions/vat-tu/data"
import VatTuForm, { VatTu } from "./form"
import VatTuTable from "./table"
import VatTuSkeleton from "./skeleton"

export default function VatTuManager({
  initialDataPromise,
}: {
  initialDataPromise?: Promise<{ items: VatTu[]; total: number }>
}) {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState("")
  const [dataPromise, setDataPromise] = useState<Promise<{ items: VatTu[]; total: number }>>(
    () => initialDataPromise ?? (listVatTu("", 1, 10) as Promise<{ items: VatTu[]; total: number }>),
  )
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(search: string) {
    setFilter(search)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(listVatTu(search, 1, 10) as Promise<{ items: VatTu[]; total: number }>)
    }, 400)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setDataPromise(listVatTu(filter, newPage, 10) as Promise<{ items: VatTu[]; total: number }>)
  }

  function handleReload() {
    setDataPromise(listVatTu(filter, page, 10) as Promise<{ items: VatTu[]; total: number }>)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Vật tư</h1>
          <VatTuForm onSuccess={handleReload} />
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách vật tư</h2>
            <input
              value={filter}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Lọc theo mã vật tư"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-md"
            />
          </div>

          <Suspense fallback={<VatTuSkeleton />}>
            <VatTuTable
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
