import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import VatTuManager from "./vat-tu-manager"

export default async function VatTuPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return <VatTuManager />
}
