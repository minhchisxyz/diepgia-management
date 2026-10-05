"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Đăng nhập không thành công");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Không thể kết nối đến máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Đăng nhập</h1>
          <p className="mt-2 text-sm text-zinc-500">Đăng nhập để tiếp tục quản lý hệ thống</p>
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Tên đăng nhập
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
