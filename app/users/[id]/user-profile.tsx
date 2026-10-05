"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type User = { id: string; name: string; username: string; role: "ADMIN" | "USER" };

export default function UserProfile({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password: password || undefined }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Đã cập nhật thông tin." : result.error ?? "Cập nhật thất bại");
    if (response.ok) setPassword("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <form onSubmit={save} className="mx-auto max-w-xl space-y-6 rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Trang chính</Link>
        <div><h1 className="text-3xl font-semibold text-zinc-900">Thông tin cá nhân</h1><p className="mt-2 text-zinc-500">Tên đăng nhập: {user.username}</p></div>
        <label className="block text-sm font-medium text-zinc-700">Tên hiển thị<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2" required /></label>
        <label className="block text-sm font-medium text-zinc-700">Mật khẩu mới<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="Để trống nếu không đổi" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
        {message && <p className="text-sm text-zinc-600">{message}</p>}
        <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700">Lưu thay đổi</button>
      </form>
    </main>
  );
}
