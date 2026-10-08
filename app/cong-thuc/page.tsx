import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import CongThucManager from "./cong-thuc-manager"

export default async function CongThucPage() {
  if (!await getSession()) redirect("/login")
  return <CongThucManager />
}
