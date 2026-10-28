import { listCustomers } from "@/lib/actions/khach-hang/data"
import KhachHangManager from "@/components/khach-hang/manager"
import { KhachHang } from "@/components/khach-hang/form"

export default function KhachHangPage() {
  const initialDataPromise = listCustomers("") as Promise<{ items: KhachHang[]; total: number }>

  return <KhachHangManager initialDataPromise={initialDataPromise} />
}
