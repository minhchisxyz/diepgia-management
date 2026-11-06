"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { BangCongNoRow, exportCongNoExcel, getBangCongNo } from "@/lib/actions/cong-no/data"
import { downloadFile, formatPrice } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import CongNoForm, { Customer } from "./form"
import CongNoCreateForm from "./cong-no-create-form"
import CongNoTable from "./table"
import CongNoSkeleton from "./skeleton"
import { ExcelButton } from "@/components/buttons"

export default function CongNoManager({
  customers: initialCustomers = [],
  customersPromise,
}: {
  customers?: Customer[]
  customersPromise?: Promise<Customer[]>
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [selectedMskh, setSelectedMskh] = useState("")
  const today = new Date()
  const [startDate, setStartDate] = useState(`${today.getFullYear()}-${today.getMonth() + 1}-01`)
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [page, setPage] = useState(1)
  const [congNo, setCongNo] = useState(0)
  const [congNoDauKy, setCongNoDauKy] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [dataPromise, setDataPromise] = useState<
    Promise<{ items: BangCongNoRow[]; total: number; congNo: number; congNoDauKy: number }>
  >(() => Promise.resolve({ items: [], total: 0, congNo: 0, congNoDauKy: 0 }))
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    let active = true
    if (customersPromise) {
      customersPromise.then((data) => {
        if (active) setCustomers(data)
      })
    }
    return () => {
      active = false
    }
  }, [customersPromise])

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
      setPage(1)
      fetchCongNoData(selectedMskh, startDate, endDate, 1)
    }, 200)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [selectedMskh, startDate, endDate])

  function fetchCongNoData(customerCode: string, start: string, end: string, targetPage = 1) {
    if (!start || !end) {
      toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc")
      return
    }

    setHasSearched(true)

    const promise = getBangCongNo({
      mskh: customerCode || undefined,
      startDate: start,
      endDate: end,
      page: targetPage,
      pageSize: 10,
    }).then((res) => {
      if (res.error) {
        toast.error(res.error)
        return { items: [], total: 0, congNo: 0, congNoDauKy: 0 }
      }
      setCongNo(res.congNo)
      setCongNoDauKy(res.congNoDauKy)
      return { items: res.items, total: res.total, congNo: res.congNo, congNoDauKy: res.congNoDauKy }
    }).catch(() => {
      toast.error("Không thể tải bảng công nợ")
      return { items: [], total: 0, congNo: 0, congNoDauKy: 0 }
    })

    setDataPromise(promise)
  }

  function handleTra() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    setPage(1)
    fetchCongNoData(selectedMskh, startDate, endDate, 1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchCongNoData(selectedMskh, startDate, endDate, newPage)
  }

  function handleFormSuccess() {
    if (hasSearched && startDate && endDate) {
      fetchCongNoData(selectedMskh, startDate, endDate, page)
    }
  }

  async function exportExcel() {
    if (!startDate || !endDate) {
      toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc")
      return
    }

    const promise = exportCongNoExcel(
      selectedMskh || undefined,
      startDate,
      endDate,
    ).then((res) => {
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (res.data && res.fileName) {
        downloadFile(res.data, res.fileName)
      }
    })

    toast.promise(promise, {
      loading: "Đang xuất bảng công nợ...",
      success: "Đã xuất bảng công nợ thành công",
      error: (err) => `Không thể xuất bảng công nợ: ${err?.message || err}`,
    })
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <Tabs defaultValue="thu-tien" className="w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
              <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
                Quản lý công nợ
              </h1>
              <TabsList>
                <TabsTrigger value="thu-tien">Thu tiền</TabsTrigger>
                <TabsTrigger value="cong-no">Tạo công nợ</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="thu-tien" className="pt-2">
              <CongNoForm customers={customers} onSuccess={handleFormSuccess} />
            </TabsContent>
            <TabsContent value="cong-no" className="pt-2">
              <CongNoCreateForm customers={customers} onSuccess={handleFormSuccess} />
            </TabsContent>
          </Tabs>
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4 sm:p-6 overflow-x-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <h2 className="text-xl font-semibold text-zinc-900 whitespace-nowrap shrink-0">
                Bảng công nợ
              </h2>
              <ExcelButton onClick={exportExcel} />
            </div>

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
                Đầu kỳ:{" "}
                <span
                  className={
                    congNoDauKy > 0 ? "text-amber-600" : congNoDauKy < 0 ? "text-blue-600" : "text-zinc-900"
                  }
                >
                  {hasSearched ? `${formatPrice(congNoDauKy)} đ` : "0 đ"}
                </span>
              </div>

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
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Tra
              </button>
            </div>
          </div>

          <Suspense fallback={<CongNoSkeleton />}>
            <CongNoTable
              dataPromise={dataPromise}
              hasSearched={hasSearched}
              page={page}
              onPageChange={handlePageChange}
            />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
