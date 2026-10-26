"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  async function handleLogin(formData: FormData) {
    const username = (formData.get("username") as string)?.trim() || ""
    setIsLoggingIn(true)

    const promise = loginAction({}, formData)
      .then((res) => {
        if (res.error) {
          return { error: res.error }
        }
        router.replace("/")
        router.refresh()
        return res
      })
      .finally(() => {
        setIsLoggingIn(false)
      })

    toast.promise(promise, {
      loading: "Đang đăng nhập...",
      success: "Đăng nhập thành công",
      error: (err) => `Đăng nhập thất bại: ${err?.message || err}`,
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <form
        action={handleLogin}
        className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Đăng nhập</h1>
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Tên đăng nhập (*)
          <input
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none"
            autoComplete="username"
            name="username"
            required
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Mật khẩu (*)
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none"
            autoComplete="current-password"
            name="password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={isLoggingIn}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed hover:cursor-pointer disabled:opacity-50"
        >
          {isLoggingIn && <Spinner className="size-4" />}
          {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
