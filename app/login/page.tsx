"use client"

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction, type AuthActionState } from "@/lib/actions/auth";
import { toast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthActionState, FormData>(loginAction, {});

  useEffect(() => {
    if (state.success) {
      toast.success("Đăng nhập thành công");
      router.replace("/");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [router, state.success, state.error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <form
        action={action}
        className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Đăng nhập</h1>
          <p className="mt-2 text-sm text-zinc-500">Đăng nhập để tiếp tục quản lý hệ thống</p>
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Tên đăng nhập (*)
          <input
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            autoComplete="username"
            name="username"
            required
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Mật khẩu (*)
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            autoComplete="current-password"
            name="password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
