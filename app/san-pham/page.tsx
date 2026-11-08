import { listProducts } from "@/lib/actions/san-pham/data"
import SanPhamManager from "@/components/san-pham/manager"
import { Product } from "@/components/san-pham/form"

export default function SanPhamPage() {
  const initialDataPromise = listProducts("", 1, 10) as Promise<{
    items: Product[]
    total: number
    isAdmin?: boolean
  }>

  return <SanPhamManager initialDataPromise={initialDataPromise} />
}
