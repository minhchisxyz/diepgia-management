"use client"

import { use, useMemo, useState } from "react"
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
  const [editName, setEditName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editRole, setEditRole] = useState<User["role"]>("USER")
  const [editPassword, setEditPassword] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "name", direction: "asc" })

  const pageSize = 10
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const result = a[sort.key].localeCompare(b[sort.key], "vi")
      return sort.direction === "asc" ? result : -result
    })
  }, [users, sort])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    )
  }

  function sortLabel(key: SortKey) {
    return sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ⇅"
  }

  async function saveUser(id: string) {
    const result = (await updateUserAction(id, {
      name: editName,
      username: editUsername,
      role: editRole,
      password: editPassword || undefined,
    })) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã cập nhật người dùng")
      setEditingId(null)
      setEditPassword("")
      onReload()
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return
    const result = (await deleteUserAction(id)) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã xóa người dùng")
      onReload()
    }
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
          {sortedUsers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 sm:px-6">
                Không có người dùng nào
              </td>
            </tr>
          ) : (
            sortedUsers.map((user) =>
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
                      <SaveButton onClick={() => void saveUser(user.id)} />
                      <CancelButton onClick={() => setEditingId(null)} />
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
                      <DeleteButton onClick={() => void deleteUser(user.id)} />
                    </div>
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
      </table>

      {total > pageSize && (
        <div className="border-t border-zinc-100 p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Trước"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1) onPageChange(page - 1)
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-sm text-zinc-600">
                  Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Sau"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < Math.ceil(total / pageSize)) onPageChange(page + 1)
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
