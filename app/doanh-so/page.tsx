import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getDoanhSoData } from "@/lib/actions/doanh-so/data"
import DoanhSoManager from "@/components/doanh-so/manager"

export default async function DoanhSoPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "ADMIN") redirect("/")

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const initialYear = Number(parts.find((p) => p.type === "year")?.value ?? new Date().getFullYear())
  const initialMonth = Number(parts.find((p) => p.type === "month")?.value ?? new Date().getMonth() + 1)

  const initialDataPromise = getDoanhSoData({
    mode: "month",
    year: initialYear,
    month: initialMonth,
  })

  return (
    <DoanhSoManager
      initialDataPromise={initialDataPromise}
      initialYear={initialYear}
      initialMonth={initialMonth}
    />
  )
}
