import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listXuatHang } from "@/app/actions/xuat-hang/data"
import { listCustomers } from "@/app/actions/khach-hang/data"
import XuatHangManager from "./xuat-hang-manager"

export default async function XuatHangPage() {
  if (!await getSession()) redirect(`/login`)

  const [customerResult, xuatHangResult] = await Promise.all([
    listCustomers(``, 1, 10000),
    listXuatHang(``, 1, 10),
  ])

  return (
    <XuatHangManager
      customers={customerResult.items}
      initialProducts={[]}
      initialDeliveries={xuatHangResult.items}
      initialTotal={xuatHangResult.total}
    />
  )
}
