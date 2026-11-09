"use client"

import { Suspense, useRef, useState } from "react"
import { listIngredients } from "@/lib/actions/nguyen-lieu/data"
import NguyenLieuForm, { Ingredient } from "./form"
import NguyenLieuTable, { SortKey } from "./table"
import NguyenLieuSkeleton from "./skeleton"

export default function NguyenLieuManager({
  initialDataPromise,
}: {
  initialDataPromise?: Promise<{ items: Ingredient[]; total: number }>
}) {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "ten",
    direction: "asc",
  })
  const [dataPromise, setDataPromise] = useState<Promise<{ items: Ingredient[]; total: number }>>(
    () => initialDataPromise ?? (listIngredients("", 1, 10, sort) as Promise<{ items: Ingredient[]; total: number }>),
  )
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(search: string) {
    setFilter(search)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(listIngredients(search, 1, 10, sort) as Promise<{ items: Ingredient[]; total: number }>)
    }, 200)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setDataPromise(listIngredients(filter, newPage, 10, sort) as Promise<{ items: Ingredient[]; total: number }>)
  }

  function handleSortChange(nextSort: { key: SortKey; direction: "asc" | "desc" }) {
    setSort(nextSort)
    setPage(1)
    setDataPromise(listIngredients(filter, 1, 10, nextSort) as Promise<{ items: Ingredient[]; total: number }>)
  }

  function handleReload() {
    setDataPromise(listIngredients(filter, page, 10, sort) as Promise<{ items: Ingredient[]; total: number }>)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Nguyên liệu</h1>
          <NguyenLieuForm onSuccessAction={handleReload} />
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách nguyên liệu</h2>
            <input
              value={filter}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Tìm theo tên nguyên liệu"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-xs"
            />
          </div>

          <Suspense fallback={<NguyenLieuSkeleton />}>
            <NguyenLieuTable
              dataPromise={dataPromise}
              page={page}
              sort={sort}
              onSortChangeAction={handleSortChange}
              onPageChangeAction={handlePageChange}
              onReloadAction={handleReload}
            />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
