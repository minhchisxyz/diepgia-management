"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { listUsers, createUser as createUserAction, updateUser as updateUserAction, deleteUser as deleteUserAction } from "@/app/actions/users/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import {CancelButton, DeleteButton, EditButton, SaveButton} from "@/components/ui/buttons";

type User = {
  id: string
  name: string
  username: string
  role: "ADMIN" | "USER"
  createdAt: string
}
type SortKey = "name" | "username" | "role"

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([])
  const [username, setUsername] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editRole, setEditRole] = useState<User["role"]>("USER")
  const [editPassword, setEditPassword] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "name", direction: "asc" })
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [total, setTotal] = useState(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    const result = await listUsers(search, page, pageSize)
    setUsers(result.items as unknown as User[])
    setTotal(result.total)
  }

  useEffect(() => {
    let active = true
    listUsers("", 1, pageSize)
      .then((result) => {
        if (active) {
          setUsers(result.items as unknown as User[])
          setTotal(result.total)
        }
      })
      .catch(() => {
        if (active) setMessage("Không thể tải danh sách người dùng")
      })
    return () => {
      active = false
    }
  }, [])

  const sortedUsers = useMemo(() => [...users].sort((a, b) => {
    const result = a[sort.key].localeCompare(b[sort.key], "vi")
    return sort.direction === "asc" ? result : -result
  }), [users, sort])
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const visibleUsers = sortedUsers

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" })
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕"
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    const result = await createUserAction(username) as { error?: string }
    if (result.error) {
      setMessage(result.error ?? "Không thể tạo người dùng")
      return
    }
    setUsername("")
    setMessage("Đã tạo người dùng. Mật khẩu tạm thời giống tên đăng nhập.")
    await load()
  }

  async function saveUser(id: string) {
    const result = await updateUserAction(id, { name: editName, username: editUsername, role: editRole, password: editPassword || undefined }) as { error?: string }
    setMessage(result.error ? result.error : "Đã cập nhật người dùng")
    if (!result.error) {
      setEditingId(null)
      setEditPassword("")
      await load()
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return
    const result = await deleteUserAction(id) as { error?: string }
    setMessage(result.error ? result.error : "Đã xóa người dùng")
    if (!result.error) await load()
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Trang chính</Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">Quản lý người dùng</h1>
        </div>
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-zinc-900">Tạo người dùng mới</h2>
          <p className="mt-1 text-sm text-zinc-500">Tên và mật khẩu mặc định sẽ giống tên đăng nhập.</p>
          <form onSubmit={createUser} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">Tên đăng nhập (*)
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" minLength={8} required className="rounded-lg border border-zinc-300 px-3 py-2 font-normal" />
            </label>
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700">Tạo người dùng</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-900">Danh sách người dùng</h2>
            <input value={search} onChange={(event) => {
              const value = event.target.value
              setSearch(value)
              if (searchTimer.current) clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => {
                setPage(1)
                void listUsers(value, 1, pageSize).then((result) => {
                  setUsers(result.items as unknown as User[])
                  setTotal(result.total)
                })
              }, 500)
            }} placeholder="Tìm tên hoặc tên đăng nhập" className="w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-5 py-3 sm:px-6">
                  <button type="button"
                          onClick={() => toggleSort("name")}
                          className="font-semibold hover:text-zinc-900">Tên{sortLabel("name")}
                  </button>
                </th>
                <th className="px-5 py-3 sm:px-6">
                  <button type="button"
                          onClick={() => toggleSort("username")}
                          className="font-semibold hover:text-zinc-900">Tên đăng nhập{sortLabel("username")}</button>
                </th>
                <th className="px-5 py-3 sm:px-6">
                  <button type="button"
                          onClick={() => toggleSort("role")}
                          className="font-semibold hover:text-zinc-900">Vai trò{sortLabel("role")}</button>
                </th>
                <th className="px-5 py-3 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => editingId === user.id ? (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-5 py-3 sm:px-6">
                    <input value={editName}
                           onChange={(event) => setEditName(event.target.value)}
                           className="w-full rounded border border-zinc-300 px-2 py-1"/>
                  </td>
                  <td className="px-5 py-3 sm:px-6">4
                    <input value={editUsername}
                           onChange={(event) => setEditUsername(event.target.value)}
                           minLength={8}
                           className="w-full rounded border border-zinc-300 px-2 py-1"/>
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    <select value={editRole}
                            onChange={(event) => setEditRole(event.target.value as User["role"])}
                            className="rounded border border-zinc-300 px-2 py-1">
                      <option value="USER">Người dùng</option>
                      <option value="ADMIN">Quản trị viên</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="password"
                             value={editPassword}
                             onChange={(event) => setEditPassword(event.target.value)}
                             minLength={8}
                             placeholder="Mật khẩu mới"
                             className="w-32 rounded border border-zinc-300 px-2 py-1"/>
                      <SaveButton onClick={() => void saveUser(user.id)} />
                      <CancelButton onClick={() => setEditingId(null)} />
                    </div></td>
                </tr>
              ) : (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-5 py-4 sm:px-6">{user.name}</td>
                  <td className="px-5 py-4 sm:px-6">{user.username}</td>
                  <td className="px-5 py-4 sm:px-6">{user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</td>
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex gap-3">
                      <EditButton onClick={() => {
                        setEditingId(user.id)
                        setEditName(user.name)
                        setEditUsername(user.username)
                        setEditRole(user.role)
                        setEditPassword("")
                      }}/>
                      <DeleteButton onClick={() => void deleteUser(user.id)}/>
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
                                      e.preventDefault()
                                      const next = Math.max(1, page - 1)
                                      setPage(next)
                                      void listUsers(search, next, pageSize).then((r) => {
                                        setUsers(r.items as unknown as User[])
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
                                  e.preventDefault()
                                  const next = Math.min(pageCount, page + 1);
                                  setPage(next)
                                  void listUsers(search, next, pageSize).then((r) => {
                                    setUsers(r.items as unknown as User[])
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
