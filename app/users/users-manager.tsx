"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "USER";
  createdAt: string;
};

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/users")
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json()) as User[];
        if (active) setUsers(result);
      })
      .catch(() => {
        if (active) setMessage("Không thể tải danh sách người dùng");
      });

    return () => {
      active = false;
    };
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Không thể tạo người dùng");
      return;
    }
    setUsername("");
    setMessage("Đã tạo người dùng. Mật khẩu tạm thời giống tên đăng nhập.");
    const usersResponse = await fetch("/api/users");
    if (usersResponse.ok) setUsers((await usersResponse.json()) as User[]);
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Trang chính</Link>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Quản lý người dùng</h1>
          </div>
        </div>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Tạo người dùng mới</h2>
          <p className="mt-1 text-sm text-zinc-500">Tên và mật khẩu mặc định sẽ giống tên đăng nhập.</p>
          <form onSubmit={createUser} className="mt-4 flex gap-3">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Tên đăng nhập"
              minLength={8}
              required
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
            <button className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700">Tạo người dùng</button>
          </form>
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        </section>
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <h2 className="p-6 text-xl font-semibold text-zinc-900">Danh sách người dùng</h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr><th className="px-6 py-3">Tên</th><th className="px-6 py-3">Tên đăng nhập</th><th className="px-6 py-3">Vai trò</th><th className="px-6 py-3">Thao tác</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-6 py-4">{user.name}</td>
                  <td className="px-6 py-4">{user.username}</td>
                  <td className="px-6 py-4">{user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</td>
                  <td className="px-6 py-4 text-zinc-500">Chỉ chủ tài khoản được chỉnh sửa</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
