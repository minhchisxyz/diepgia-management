import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listNhapHang } from "@/app/actions/nhap-hang/data"
import NhapHangManager, { NhapHangItem } from "@/components/nhap-hang-manager"

export default async function NhapHangPage() {
  if (!(await getSession())) redirect(`/login`)

  const nhapHangResult = await listNhapHang(``, 1, 10)

  return (
    <NhapHangManager
      initialItems={nhapHangResult.items as NhapHangItem[]}
      initialTotal={nhapHangResult.total}
    />
  )
}
