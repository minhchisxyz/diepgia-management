import { listCustomers } from "@/lib/actions/khach-hang/data"
import CongNoManager from "@/components/cong-no/manager"
import { Customer } from "@/components/cong-no/form"
import { getBangCongNo, listThuTien } from "@/lib/actions/cong-no/data"

export default function CongNoPage() {
  const customersPromise = listCustomers(``, 1, 10000).then(
    (res) => res.items as Customer[]
  )

  const today = new Date()
  const startDate = `${today.getFullYear()}-${today.getMonth() + 1}-01`
  const endDate = today.toISOString().slice(0, 10)

  const initialDataPromise = getBangCongNo({
    startDate,
    endDate,
    page: 1,
    pageSize: 10,
    sort: { key: "ngay", direction: "desc" },
  })

  const initialThuTienPromise = listThuTien({
    page: 1,
    pageSize: 10,
    sort: { key: "soPhieu", direction: "desc" },
  })

  return (
    <CongNoManager
      customersPromise={customersPromise}
      initialDataPromise={initialDataPromise}
      initialThuTienPromise={initialThuTienPromise}
    />
  )
}
