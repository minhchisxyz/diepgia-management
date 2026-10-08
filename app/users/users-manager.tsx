"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"

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

  async function load() {
    const response = await fetch("/api/users")
    if (response.ok) setUsers(await response.json() as User[])
  }

  useEffect(() => {
    let active = true
    fetch("/api/users")
      .then(async (response) => {
        if (!response.ok) return
        const result = await response.json() as User[]
        if (active) setUsers(result)
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
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) {
      setMessage(result.error ?? "Không thể tạo người dùng")
      return
    }
    setUsername("")
    setMessage("Đã tạo người dùng. Mật khẩu tạm thời giống tên đăng nhập.")
    await load()
  }

  async function saveUser(id: string) {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, username: editUsername, role: editRole, password: editPassword || undefined }),
    })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã cập nhật người dùng" : result.error ?? "Không thể cập nhật người dùng")
    if (response.ok) {
      setEditingId(null)
      setEditPassword("")
      await load()
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? "Đã xóa người dùng" : result.error ?? "Không thể xóa người dùng")
    if (response.ok) await load()
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
          <h2 className="p-5 text-xl font-semibold text-zinc-900 sm:p-6">Danh sách người dùng</h2>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-5 py-3 sm:px-6"><button type="button" onClick={() => toggleSort("name")} className="font-semibold hover:text-zinc-900">Tên{sortLabel("name")}</button></th>
                <th className="px-5 py-3 sm:px-6"><button type="button" onClick={() => toggleSort("username")} className="font-semibold hover:text-zinc-900">Tên đăng nhập{sortLabel("username")}</button></th>
                <th className="px-5 py-3 sm:px-6"><button type="button" onClick={() => toggleSort("role")} className="font-semibold hover:text-zinc-900">Vai trò{sortLabel("role")}</button></th>
                <th className="px-5 py-3 sm:px-6">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => editingId === user.id ? (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-5 py-3 sm:px-6"><input value={editName} onChange={(event) => setEditName(event.target.value)} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                  <td className="px-5 py-3 sm:px-6"><input value={editUsername} onChange={(event) => setEditUsername(event.target.value)} minLength={8} className="w-full rounded border border-zinc-300 px-2 py-1" /></td>
                  <td className="px-5 py-3 sm:px-6"><select value={editRole} onChange={(event) => setEditRole(event.target.value as User["role"])} className="rounded border border-zinc-300 px-2 py-1"><option value="USER">Người dùng</option><option value="ADMIN">Quản trị viên</option></select></td>
                  <td className="px-5 py-3 sm:px-6"><div className="flex flex-wrap items-center gap-2"><input type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} minLength={8} placeholder="Mật khẩu mới" className="w-32 rounded border border-zinc-300 px-2 py-1" /><button type="button" onClick={() => void saveUser(user.id)} className="text-green-700 hover:underline">Lưu</button><button type="button" onClick={() => setEditingId(null)} className="text-zinc-600 hover:underline">Hủy</button></div></td>
                </tr>
              ) : (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-5 py-4 sm:px-6">{user.name}</td><td className="px-5 py-4 sm:px-6">{user.username}</td><td className="px-5 py-4 sm:px-6">{user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</td>
                  <td className="px-5 py-4 sm:px-6"><div className="flex gap-3"><button type="button" onClick={() => { setEditingId(user.id); setEditName(user.name); setEditUsername(user.username); setEditRole(user.role); setEditPassword("") }} className="text-blue-700 hover:underline">Sửa</button><button type="button" onClick={() => void deleteUser(user.id)} className="text-red-700 hover:underline">Xóa</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
