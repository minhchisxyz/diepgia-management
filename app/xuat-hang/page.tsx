import { listXuatHang } from "@/lib/actions/xuat-hang/data"
import { listCustomers } from "@/lib/actions/khach-hang/data"
import XuatHangManager, { Customer, DeliveryItem } from "@/components/xuat-hang/manager"

export default function XuatHangPage() {
  const customersPromise = listCustomers(``, 1, 10000).then(
    (res) => res.items as Customer[]
  )
  const initialDataPromise = listXuatHang(``, 1, 10) as Promise<{
    items: DeliveryItem[]
    total: number
    isAdmin?: boolean
  }>

  return (
    <XuatHangManager
      customersPromise={customersPromise}
      initialDataPromise={initialDataPromise}
    />
  )
}
