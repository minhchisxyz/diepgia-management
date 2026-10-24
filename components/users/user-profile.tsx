"use client"

import { useState } from "react";
import Link from "next/link";
import { updateProfile } from "@/lib/actions/users/data";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";

type User = { id: string; name: string; username: string; role: "ADMIN" | "USER" };

export default function UserProfile({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save(formData: FormData) {
    const formName = (formData.get("name") as string)?.trim() || name;
    const formPassword = (formData.get("password") as string) || password;
    setIsSaving(true);
    const promise = updateProfile({ name: formName, password: formPassword || undefined })
      .then((result) => {
        setPassword("");
        return result;
      })
      .finally(() => {
        setIsSaving(false);
      });

    toast.promise(promise, {
      loading: `Đang cập nhật thông tin người dùng [${user.username}]...`,
      success: `Đã cập nhật thông tin người dùng [${user.username}] thành công`,
      error: (err) => `Không thể cập nhật thông tin: ${err?.message || err}`,
    });
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <form action={save} className="mx-auto max-w-xl space-y-6 rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Trang chính</Link>
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Thông tin cá nhân</h1>
          <p className="mt-2 text-zinc-500">Tên đăng nhập: {user.username}</p>
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Tên hiển thị (*)
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Mật khẩu mới
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            placeholder="Để trống nếu không đổi"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isSaving && <Spinner className="size-4" />}
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </main>
  );
}
