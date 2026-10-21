"use client"

import { useState } from "react"
import { getLoaiVatTuLabel, loaiVatTuLabels } from "@/lib/loai-vat-tu"
import { createVatTu as createVatTuAction } from "@/lib/actions/vat-tu/data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

export type VatTu = {
  ms: string
  loai: keyof typeof loaiVatTuLabels
  kho: number
  donGia: string | null
}

export default function VatTuForm({
  onSuccess,
}: {
  onSuccess?: () => void
}) {
  const [ms, setMs] = useState("")
  const [loai, setLoai] = useState<VatTu["loai"]>("THUNG")

  async function createVatTu(formData: FormData) {
    const formMs = (formData.get("ms") as string)?.trim() || ms
    const formLoai = (formData.get("loai") as VatTu["loai"]) || loai
    const result = (await createVatTuAction({ ms: formMs, loai: formLoai })) as { error?: string }
    if (result.error) {
      toast.error(result.error ?? "Không thể tạo vật tư")
      return
    }
    setMs("")
    toast.success("Đã tạo vật tư")
    onSuccess?.()
  }

  return (
    <div>
      <form action={createVatTu} className="mt-5 flex flex-row gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Mã vật tư (*)
          <input
            name="ms"
            value={ms}
            onChange={(event) => setMs(event.target.value)}
            placeholder="Nhập mã vật tư"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 min-w-40">
          Loại vật tư (*)
          <Select
            name="loai"
            value={loai}
            onValueChange={(val) => setLoai(val as VatTu["loai"])}
          >
            <SelectTrigger className="w-full h-10 border-zinc-300 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(loaiVatTuLabels).map((value) => (
                <SelectItem key={value} value={value}>
                  {getLoaiVatTuLabel(value as VatTu["loai"])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex flex-col justify-end">
          <button className="rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer">
            Thêm vật tư
          </button>
        </div>
      </form>
    </div>
  )
}
