import { listVatTu } from "@/lib/actions/vat-tu/data"
import VatTuManager from "@/components/vat-tu/manager"
import { VatTu } from "@/components/vat-tu/form"

export default function VatTuPage() {
  const initialDataPromise = listVatTu("") as Promise<{ items: VatTu[]; total: number }>

  return <VatTuManager initialDataPromise={initialDataPromise} />
}
