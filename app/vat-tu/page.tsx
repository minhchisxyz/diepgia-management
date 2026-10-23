import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { listVatTu } from "@/lib/actions/vat-tu/data"
import VatTuManager from "@/components/vat-tu/manager"
import { VatTu } from "@/components/vat-tu/form"

export default async function VatTuPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const initialDataPromise = listVatTu("") as Promise<{ items: VatTu[]; total: number }>

  return <VatTuManager initialDataPromise={initialDataPromise} />
}
