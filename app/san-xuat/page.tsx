import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listSanXuat } from "@/lib/actions/san-xuat/data"
import { listCustomers } from "@/lib/actions/khach-hang/data"
import SanXuatManager from "@/components/san-xuat/manager"

export default async function SanXuatPage() {
  if (!await getSession()) redirect(`/login`)

  const [customerResult, sanXuatResult] = await Promise.all([
    listCustomers(``, 1, 10000),
    listSanXuat(``, 1, 10),
  ])

  return (
    <SanXuatManager
      customers={customerResult.items}
      initialSanXuat={sanXuatResult.items}
      initialTotal={sanXuatResult.total}
    />
  )
}
