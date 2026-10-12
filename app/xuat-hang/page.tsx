import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listCustomers } from "@/app/actions/data"
import XuatHangManager from "./xuat-hang-manager"

export default async function XuatHangPage() {
  if (!await getSession()) redirect(`/login`)

  const result = await listCustomers(``, 1, 10000)
  return <XuatHangManager customers={result.items} initialProducts={[]} />
}
