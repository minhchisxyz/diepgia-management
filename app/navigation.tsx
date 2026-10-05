"use client";

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type CurrentUser = {
  id: string
  username: string
  role: "ADMIN" | "USER"
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (pathname === "/login") return
    fetch("/api/auth/me")
      .then(async (response) => {
        if (response.ok) setUser((await response.json()) as CurrentUser)
      })
      .catch(() => undefined)
  }, [pathname])

  if (pathname === "/login" || !user) return null

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  const profileHref = `/users/${user.id}`

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900">
          Diệp Gia
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <Link href="/vat-tu" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Vật tư
          </Link>
          <Link href="/khach-hang" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Khách hàng
          </Link>
          {user.role === "ADMIN" && <Link href="/users" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Người dùng</Link>}
        </div>

        <div className="hidden items-center lg:flex">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span>{user.username}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              <Link href={profileHref} className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                Thông tin cá nhân
              </Link>
              <button onClick={logout} className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">
                Đăng xuất
              </button>
            </div>
          </details>
        </div>

        <button
          type="button"
          aria-label="Mở trình đơn"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 lg:hidden"
        >
          <span className="text-2xl leading-none">{menuOpen ? "×" : "☰"}</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-zinc-200 px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            <Link href="/vat-tu" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">Vật tư</Link>
            <Link href="/khach-hang" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">Khách hàng</Link>
            {user.role === "ADMIN" && <Link href="/users" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">Người dùng</Link>}
            <Link href={profileHref} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
              Thông tin cá nhân
            </Link>
            <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100">
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
