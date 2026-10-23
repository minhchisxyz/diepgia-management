"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getCurrentUserAction, logoutAction } from "@/lib/actions/auth"

type CurrentUser = {
  id: string
  username: string
  name: string
  role: "ADMIN" | "USER"
}

type MyLink = {
  href: string
  label: string
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const links: MyLink[] = [
    { href: "/khach-hang", label: "Khách hàng" },
    { href: "/vat-tu", label: "Vật tư" },
    { href: "/nguyen-lieu", label: "Nguyên liệu" },
    { href: "/san-pham", label: "Sản phẩm" },
    { href: "/nhap-hang", label: "Nhập hàng" },
    { href: "/san-xuat", label: "Sản xuất" },
    { href: "/xuat-hang", label: "Xuất hàng" },
    { href: "/cong-no", label: "Công nợ" },
  ]

  useEffect(() => {
    if (pathname === "/login") return
    getCurrentUserAction().then(setUser).catch(() => undefined)
  }, [pathname])

  if (pathname === "/login" || !user) return null

  async function logout() {
    await logoutAction()
    router.replace("/login")
    router.refresh()
  }

  const profileHref = `/users/${user.id}`

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.jpg"
            alt="Diệp Gia"
            width={120}
            height={44}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          { links.map (link => (
            <Link key={link.href} href={link.href} className={`text-sm font-medium text-zinc-600 hover:text-zinc-900 ${pathname.includes(link.href) ? "font-semibold" : ""}`}>
              {link.label}
            </Link>
          ))}
          {user.role === "ADMIN" && <Link href="/users" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Người dùng</Link>}
        </div>

        <div className="hidden items-center lg:flex">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span>{user.name}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              <Link href={profileHref} className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                Thông tin cá nhân
              </Link>
              <button onClick={logout} className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 hover:cursor-pointer">
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
            {links.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 ${pathname.includes(link.href) ? "font-semibold" : ""}`}>
                {link.label}
              </Link>
            ))}
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
