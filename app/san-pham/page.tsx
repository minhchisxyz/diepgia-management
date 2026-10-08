import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import SanPhamManager from "./san-pham-manager"

export default async function SanPhamPage() {
  if (!await getSession()) redirect("/login")
  return <SanPhamManager />
}
