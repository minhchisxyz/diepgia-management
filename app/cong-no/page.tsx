import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listCustomers } from "@/app/actions/khach-hang/data"
import CongNoManager from "../../components/cong-no-manager"

export default async function CongNoPage() {
  if (!await getSession()) redirect(`/login`)

  const customerResult = await listCustomers(``, 1, 10000)

  return (
    <CongNoManager
      customers={customerResult.items}
    />
  )
}
