import { listCustomers } from "@/lib/actions/khach-hang/data"
import CongNoManager from "@/components/cong-no/manager"
import { Customer } from "@/components/cong-no/form"

export default function CongNoPage() {
  const customersPromise = listCustomers(``, 1, 10000).then(
    (res) => res.items as Customer[]
  )

  return <CongNoManager customersPromise={customersPromise} />
}
