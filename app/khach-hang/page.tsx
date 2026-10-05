import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import KhachHangManager from "./khach-hang-manager"

export default async function KhachHangPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return <KhachHangManager />
}
