import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listCustomers } from "@/lib/actions/khach-hang/data"
import KhachHangManager from "@/components/khach-hang/manager"
import { KhachHang } from "@/components/khach-hang/form"

export default async function KhachHangPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const initialDataPromise = listCustomers("") as Promise<{ items: KhachHang[]; total: number }>

  return <KhachHangManager initialDataPromise={initialDataPromise} />
}
