import { listProducts } from "@/lib/actions/san-pham/data"
import SanPhamManager from "@/components/san-pham/manager"
import { Product } from "@/components/san-pham/form"

export default function SanPhamPage() {
  const initialDataPromise = listProducts("") as Promise<{ items: Product[]; total: number }>

  return <SanPhamManager initialDataPromise={initialDataPromise} />
}
