"use client"

import { use, useEffect, useMemo, useState } from "react"
import { updateUser as updateUserAction, deleteUser as deleteUserAction } from "@/lib/actions/users/data"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
import { CancelButton, DeleteButton, EditButton, SaveButton } from "@/components/buttons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { User } from "./form"

type SortKey = "name" | "username" | "role"

export default function UsersTable({
  dataPromise,
  page,
  onPageChange,
  onReload,
}: {
  dataPromise: Promise<{ items: User[]; total: number }>
  page: number
  onPageChange: (newPage: number) => void
  onReload: () => void
}) {
  const { items: users, total } = use(dataPromise)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editRole, setEditRole] = useState<User["role"]>("USER")
  const [editPassword, setEditPassword] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "name", direction: "asc" })

  const [localPage, setLocalPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    setLocalPage(1)
  }, [users])

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const result = a[sort.key].localeCompare(b[sort.key], "vi", { numeric: true })
      return sort.direction === "asc" ? result : -result
    })
  }, [users, sort])

  const totalItems = sortedUsers.length
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(1, localPage), pageCount)

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedUsers.slice(start, start + pageSize)
  }, [sortedUsers, currentPage, pageSize])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    )
    setLocalPage(1)
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ⇅"
  }

  async function saveUser(id: string) {
    const targetUser = users.find((u) => u.id === id)
    const label = `[${editUsername || targetUser?.username || id}] - ${editName || targetUser?.name || ""}`
    setSavingId(id)

    const promise = updateUserAction(id, {
      name: editName,
      username: editUsername,
      role: editRole,
      password: editPassword || undefined,
    })
      .then((result) => {
        setEditingId(null)
        setEditPassword("")
        onReload()
        return result
      })
      .finally(() => {
        setSavingId(null)
      })

    toast.promise(promise, {
      loading: `Đang cập nhật người dùng ${label}...`,
      success: `Đã cập nhật người dùng ${label} thành công`,
      error: (err) => `Không thể cập nhật người dùng: ${err?.message || err}`,
    })
  }

  async function deleteUser(id: string) {
    const targetUser = users.find((u) => u.id === id)
    const label = `[${targetUser?.username ?? id}]${targetUser?.name ? ` - ${targetUser.name}` : ""}`
    if (!window.confirm(`Bạn có chắc muốn xóa người dùng ${label}?`)) return

    setDeletingId(id)
    const promise = deleteUserAction(id)
      .then((result) => {
        onReload()
        return result
      })
      .finally(() => {
        setDeletingId(null)
      })

    toast.promise(promise, {
      loading: `Đang xóa người dùng ${label}...`,
      success: `Đã xóa người dùng ${label} thành công`,
      error: (err) => `Không thể xóa người dùng: ${err?.message || err}`,
    })
  }

  return (
    <>
      <table className="w-full min-w-190 text-left text-sm">
        <thead className="sticky top-16 z-10 bg-zinc-100 text-zinc-600">
          <tr>
            <th className="px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("name")}
                className="font-semibold hover:text-zinc-900"
              >
                Tên{sortLabel("name")}
              </button>
            </th>
            <th className="px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("username")}
                className="font-semibold hover:text-zinc-900"
              >
                Tên đăng nhập{sortLabel("username")}
              </button>
            </th>
            <th className="px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => toggleSort("role")}
                className="font-semibold hover:text-zinc-900"
              >
                Vai trò{sortLabel("role")}
              </button>
            </th>
            <th className="px-5 py-3 sm:px-6">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {paginatedUsers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 sm:px-6">
                Không có người dùng nào
              </td>
            </tr>
          ) : (
            paginatedUsers.map((user) =>
              editingId === user.id ? (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-5 py-3 sm:px-6">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    <input
                      value={editUsername}
                      onChange={(event) => setEditUsername(event.target.value)}
                      minLength={8}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    <Select
                      value={editRole}
                      onValueChange={(val) => setEditRole(val as User["role"])}
                    >
                      <SelectTrigger className="w-32 h-8 rounded border-zinc-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">Người dùng</SelectItem>
                        <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(event) => setEditPassword(event.target.value)}
                        minLength={8}
                        placeholder="Mật khẩu mới"
                        className="w-32 rounded border border-zinc-300 px-2 py-1"
                      />
                      <SaveButton
                        onClick={() => void saveUser(user.id)}
                        loading={savingId === user.id}
                        disabled={savingId !== null}
                      />
                      <CancelButton
                        onClick={() => setEditingId(null)}
                        disabled={savingId === user.id}
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-5 py-3 font-medium text-zinc-900 sm:px-6">{user.name}</td>
                  <td className="px-5 py-3 sm:px-6">{user.username}</td>
                  <td className="px-5 py-3 sm:px-6">
                    {user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      <EditButton
                        onClick={() => {
                          setEditingId(user.id)
                          setEditName(user.name)
                          setEditUsername(user.username)
                          setEditRole(user.role)
                          setEditPassword("")
                        }}
                      />
                      <DeleteButton
                        onClick={() => void deleteUser(user.id)}
                        loading={deletingId === user.id}
                        disabled={deletingId !== null}
                      />
                    </div>
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
      </table>

      {pageCount > 1 && (
        <div className="border-t border-zinc-100 p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Trước"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1) { setLocalPage(currentPage - 1); onPageChange?.(currentPage - 1); }
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-sm text-zinc-600">
                  Trang {currentPage} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Sau"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < pageCount) { setLocalPage(currentPage + 1); onPageChange?.(currentPage + 1); }
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}
