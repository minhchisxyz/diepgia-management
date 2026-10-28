import { listNhapHang } from "@/lib/actions/nhap-hang/data"
import NhapHangManager, { NhapHangItem } from "@/components/nhap-hang/manager"

export default function NhapHangPage() {
  const initialDataPromise = listNhapHang("") as Promise<{ items: NhapHangItem[]; total: number }>

  return <NhapHangManager initialDataPromise={initialDataPromise} />
}
