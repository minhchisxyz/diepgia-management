"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { BangCongNoRow, getBangCongNo } from "@/lib/actions/cong-no/data"
import { formatPrice } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import CongNoForm, { Customer } from "./form"
import CongNoTable from "./table"
import CongNoSkeleton from "./skeleton"

export default function CongNoManager({
  customers,
}: {
  customers: Customer[]
}) {
  const [selectedMskh, setSelectedMskh] = useState("")
  const today = new Date()
  const [startDate, setStartDate] = useState(`${today.getFullYear()}-${today.getMonth() + 1}-01`)
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [congNo, setCongNo] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [dataPromise, setDataPromise] = useState<Promise<{ items: BangCongNoRow[]; congNo: number }>>(
    () => Promise.resolve({ items: [], congNo: 0 })
  )
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    handleTra()
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!startDate || !endDate) return

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchCongNoData(selectedMskh, startDate, endDate)
    }, 200)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [selectedMskh, startDate, endDate])

  function fetchCongNoData(customerCode: string, start: string, end: string) {
    if (!start || !end) {
      toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc")
      return
    }

    setHasSearched(true)

    const promise = getBangCongNo({
      mskh: customerCode || undefined,
      startDate: start,
      endDate: end,
    }).then((res) => {
      if (res.error) {
        toast.error(res.error)
        return { items: [], congNo: 0 }
      }
      setCongNo(res.congNo)
      return { items: res.items, congNo: res.congNo }
    }).catch(() => {
      toast.error("Không thể tải bảng công nợ")
      return { items: [], congNo: 0 }
    })

    setDataPromise(promise)
  }

  function handleTra() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    fetchCongNoData(selectedMskh, startDate, endDate)
  }

  function handleFormSuccess() {
    if (hasSearched && startDate && endDate) {
      fetchCongNoData(selectedMskh, startDate, endDate)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            Thu tiền
          </h1>
          <CongNoForm customers={customers} onSuccess={handleFormSuccess} />
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4 sm:p-6 overflow-x-auto">
            <h2 className="text-xl font-semibold text-zinc-900 whitespace-nowrap shrink-0">
              Bảng công nợ
            </h2>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <Select
                value={selectedMskh || "ALL"}
                onValueChange={(val) => setSelectedMskh(val === "ALL" ? "" : (val ?? ""))}
              >
                <SelectTrigger className="w-44 sm:w-56 truncate rounded-lg border-zinc-300 bg-white">
                  <SelectValue placeholder="Tất cả khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả khách hàng</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.mskh} value={customer.mskh}>
                      {customer.mskh} - {customer.ten}
                      {customer.tenCongTy ? ` - ${customer.tenCongTy}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="flex items-center gap-1 text-sm text-zinc-700 whitespace-nowrap shrink-0">
                <span>Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </label>

              <label className="flex items-center gap-1 text-sm text-zinc-700 whitespace-nowrap shrink-0">
                <span>Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </label>

              <div className="text-sm font-semibold text-zinc-900 whitespace-nowrap shrink-0">
                Công nợ:{" "}
                <span
                  className={
                    congNo > 0 ? "text-amber-600" : congNo < 0 ? "text-blue-600" : "text-zinc-900"
                  }
                >
                  {hasSearched ? `${formatPrice(congNo)} đ` : "0 đ"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleTra}
                disabled={!startDate || !endDate}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                Tra
              </button>
            </div>
          </div>

          <Suspense fallback={<CongNoSkeleton />}>
            <CongNoTable
              dataPromise={dataPromise}
              hasSearched={hasSearched}
            />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
