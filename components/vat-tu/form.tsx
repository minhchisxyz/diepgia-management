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
import { Spinner } from "@/components/ui/spinner"

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function createVatTu(formData: FormData) {
    const formMs = (formData.get("ms") as string)?.trim() || ms
    const formLoai = (formData.get("loai") as VatTu["loai"]) || loai

    if (!formMs) {
      toast.error("Vui lòng nhập mã vật tư")
      return
    }

    const label = `[${formMs}] (${getLoaiVatTuLabel(formLoai)})`
    setIsSubmitting(true)
    try {
      const result = (await toast.promise(
        createVatTuAction({ ms: formMs, loai: formLoai }) as Promise<{ error?: string }>,
        {
          loading: `Đang thêm vật tư ${label}...`,
          success: `Thêm vật tư ${label} thành công`,
          error: (err) => `Thêm vật tư ${label} thất bại: ${err}`,
        }
      ))
      if (!result.error) {
        setMs("")
        onSuccess?.()
      }
    } finally {
      setIsSubmitting(false)
    }
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-green-900 px-5 py-2 font-medium text-white hover:bg-green-700 hover:cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner className="size-4" />
                <span>Đang thêm...</span>
              </>
            ) : (
              "Thêm vật tư"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
