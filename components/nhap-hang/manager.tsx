"use client"

import { Suspense, useState } from "react"
import { listNhapHang } from "@/lib/actions/nhap-hang/data"
import NhapHangTable from "./table"
import NhapHangSkeleton from "./skeleton"
import type { NhapHangItem } from "./form"

export type { NhapHangItem } from "./form"

export default function NhapHangManager({
  initialDataPromise,
  initialItems,
  initialTotal,
}: {
  initialDataPromise?: Promise<{ items: NhapHangItem[]; total: number }>
  initialItems?: NhapHangItem[]
  initialTotal?: number
}) {
  const [page, setPage] = useState(1)
  const [dataPromise, setDataPromise] = useState<Promise<{ items: NhapHangItem[]; total: number }>>(
    () =>
      initialDataPromise ??
      (initialItems !== undefined
        ? Promise.resolve({ items: initialItems, total: initialTotal ?? initialItems.length })
        : (listNhapHang("", 1, 10) as Promise<{ items: NhapHangItem[]; total: number }>)),
  )

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setDataPromise(listNhapHang("", newPage, 10) as Promise<{ items: NhapHangItem[]; total: number }>)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="p-5 sm:p-6">
            <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">Lịch sử nhập hàng</h1>
          </div>

          <Suspense fallback={<NhapHangSkeleton />}>
            <NhapHangTable
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
