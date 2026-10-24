"use client"

import { useState } from "react"
import { createUser as createUserAction } from "@/lib/actions/users/data"
import { toast } from "@/components/ui/toast"
import { Spinner } from "@/components/ui/spinner"

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function createUser(formData: FormData) {
    const formUsername = (formData.get("username") as string)?.trim() || username
    if (!formUsername) {
      toast.error("Vui lòng nhập tên đăng nhập")
      return
    }

    setIsSubmitting(true)
    const promise = createUserAction(formUsername)
      .then((result) => {
        setUsername("")
        onSuccess?.()
        return result
      })
      .finally(() => {
        setIsSubmitting(false)
      })

    toast.promise(promise, {
      loading: `Đang tạo người dùng [${formUsername}]...`,
      success: `Đã tạo người dùng [${formUsername}]. Mật khẩu tạm thời giống tên đăng nhập.`,
      error: (err) => `Không thể tạo người dùng: ${err?.message || err}`,
    })
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50"
        >
          {isSubmitting && <Spinner className="size-4" />}
          {isSubmitting ? "Đang thêm..." : "Thêm người dùng"}
        </button>
      </form>
    </div>
  )
}
