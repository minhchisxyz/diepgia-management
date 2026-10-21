"use client"

import { useState } from "react"
import { createIngredient } from "@/lib/actions/nguyen-lieu/data"
import { toast } from "@/components/ui/toast"

export type Ingredient = {
  id: string
  ten: string
  donVi: string
  loai: string
  kho: number
  donGia: string | number
}

export default function NguyenLieuForm({
  onSuccess,
}: {
  onSuccess?: () => void
}) {
  const [ten, setTen] = useState("")
  const [donVi, setDonVi] = useState("")
  const [loai, setLoai] = useState("")

  async function submit(formData: FormData) {
    const formTen = (formData.get("ten") as string)?.trim() || ten
    const formDonVi = (formData.get("donVi") as string)?.trim() || donVi
    const formLoai = (formData.get("loai") as string)?.trim() || loai
    const result = (await createIngredient({ ten: formTen, donVi: formDonVi, loai: formLoai })) as { error?: string }
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Đã tạo nguyên liệu")
      setTen("")
      setDonVi("")
      setLoai("")
      onSuccess?.()
    }
  }

  return (
    <div>
      <form action={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Tên nguyên liệu (*)
          <input
            name="ten"
            value={ten}
            onChange={(event) => setTen(event.target.value)}
            placeholder="Nhập tên nguyên liệu"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Đơn vị (*)
          <input
            name="donVi"
            value={donVi}
            onChange={(event) => setDonVi(event.target.value)}
            placeholder="Nhập đơn vị"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Loại nguyên liệu (*)
          <input
            name="loai"
            value={loai}
            onChange={(event) => setLoai(event.target.value)}
            placeholder="Nhập loại nguyên liệu"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <button className="h-10 self-end rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer">
          Thêm nguyên liệu
        </button>
      </form>
    </div>
  )
}
