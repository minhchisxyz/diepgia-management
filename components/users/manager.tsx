"use client"

import { Suspense, useRef, useState } from "react"
import Link from "next/link"
import { listUsers } from "@/lib/actions/users/data"
import UsersForm, { User } from "./form"
import UsersTable from "./table"
import UsersSkeleton from "./skeleton"

export default function UsersManager({
  initialDataPromise,
}: {
  initialDataPromise?: Promise<{ items: User[]; total: number }>
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const pageSize = 10
  const [dataPromise, setDataPromise] = useState<Promise<{ items: User[]; total: number }>>(
    () => initialDataPromise ?? (listUsers("", 1, pageSize) as Promise<{ items: User[]; total: number }>),
  )
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(query: string) {
    setSearch(query)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      setDataPromise(listUsers(query, 1, pageSize) as Promise<{ items: User[]; total: number }>)
    }, 400)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setDataPromise(listUsers(search, newPage, pageSize) as Promise<{ items: User[]; total: number }>)
  }

  function handleReload() {
    setDataPromise(listUsers(search, page, pageSize) as Promise<{ items: User[]; total: number }>)
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link href="/public" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Trang chính
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">Quản lý người dùng</h1>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <UsersForm onSuccess={handleReload} />
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách người dùng</h2>
            <input
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Tìm tên hoặc tên đăng nhập"
              className="w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <Suspense fallback={<UsersSkeleton />}>
            <UsersTable
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
