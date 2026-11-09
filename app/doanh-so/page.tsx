import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getDoanhSoData } from "@/lib/actions/doanh-so/data"
import DoanhSoManager from "@/components/doanh-so/manager"

export default async function DoanhSoPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "ADMIN") redirect("/")

  const initialData = await getDoanhSoData({ mode: "month" })

  return <DoanhSoManager initialData={initialData} />
}
