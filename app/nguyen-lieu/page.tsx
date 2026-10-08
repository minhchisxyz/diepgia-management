import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import NguyenLieuManager from "./nguyen-lieu-manager"

export default async function NguyenLieuPage() {
  if (!await getSession()) redirect("/login")
  return <NguyenLieuManager />
}
