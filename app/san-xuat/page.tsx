import { listSanXuat } from "@/lib/actions/san-xuat/data"
import { listCustomers } from "@/lib/actions/khach-hang/data"
import SanXuatManager, { Customer, SanXuatItem } from "@/components/san-xuat/manager"

export default function SanXuatPage() {
  const customersPromise = listCustomers(``, 1, 10000).then(
    (res) => res.items as Customer[]
  )
  const initialDataPromise = listSanXuat(``) as Promise<{
    items: SanXuatItem[]
    total: number
  }>

  return (
    <SanXuatManager
      customersPromise={customersPromise}
      initialDataPromise={initialDataPromise}
    />
  )
}
