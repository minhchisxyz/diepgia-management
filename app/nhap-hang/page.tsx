import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listNhapHang } from "@/lib/actions/nhap-hang/data"
import NhapHangManager, { NhapHangItem } from "@/components/nhap-hang/manager"

export default async function NhapHangPage() {
  if (!(await getSession())) redirect(`/login`)

  const initialDataPromise = listNhapHang("", 1, 10) as Promise<{ items: NhapHangItem[]; total: number }>

  return <NhapHangManager initialDataPromise={initialDataPromise} />
}
