"use client"

import { useState } from "react"
import { createUser as createUserAction } from "@/lib/actions/users/data"
import { toast } from "@/components/ui/toast"

export type User = {
  id: string
  name: string
  username: string
  role: "ADMIN" | "USER"
  createdAt: string
  updatedAt: string
}

export default function UsersForm({
  onSuccess,
}: {
  onSuccess?: () => void
}) {
  const [username, setUsername] = useState("")

  async function createUser(formData: FormData) {
    const formUsername = (formData.get("username") as string)?.trim() || username
    const result = (await createUserAction(formUsername)) as { error?: string }
    if (result.error) {
      toast.error(result.error ?? "Không thể tạo người dùng")
      return
    }
    setUsername("")
    toast.success("Đã tạo người dùng. Mật khẩu tạm thời giống tên đăng nhập.")
    onSuccess?.()
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">Tạo người dùng mới</h2>
      <p className="mt-1 text-sm text-zinc-500">Tên và mật khẩu mặc định sẽ giống tên đăng nhập.</p>
      <form action={createUser} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-zinc-700">
          Tên đăng nhập (*)
          <input
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Nhập tên đăng nhập"
            minLength={8}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <button className="rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer">
          Thêm người dùng
        </button>
      </form>
    </div>
  )
}
