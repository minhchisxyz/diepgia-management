"use client"

import { Suspense, useEffect, useState } from "react"
import {
  DoanhSoData,
  DoanhSoFilterMode,
  getDoanhSoData,
} from "@/lib/actions/doanh-so/data"
import DoanhSoCharts from "./charts"
import DoanhSoSkeleton from "./skeleton"

export default function DoanhSoManager({
  initialDataPromise,
  initialYear,
  initialMonth,
}: {
  initialDataPromise?: Promise<DoanhSoData>
  initialYear: number
  initialMonth: number
}) {
  const [mode, setMode] = useState<DoanhSoFilterMode>("month")
  const [year, setYear] = useState<number>(initialYear)
  const [month, setMonth] = useState<number>(initialMonth)
  const [availableYears, setAvailableYears] = useState<number[]>(() =>
    Array.from({ length: 5 }, (_, i) => initialYear - i),
  )
  const [dataPromise, setDataPromise] = useState<Promise<DoanhSoData>>(
    () => initialDataPromise ?? getDoanhSoData({ mode: "month", year: initialYear, month: initialMonth }),
  )

  useEffect(() => {
    let active = true
    dataPromise.then(
      (res) => {
        if (active && res?.availableYears?.length > 0) {
          setAvailableYears(res.availableYears)
        }
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [dataPromise])

  function handleModeChange(nextMode: DoanhSoFilterMode) {
    setMode(nextMode)
    setDataPromise(getDoanhSoData({ mode: nextMode, year, month }))
  }

  function handleYearChange(nextYear: number) {
    setYear(nextYear)
    setDataPromise(getDoanhSoData({ mode, year: nextYear, month }))
  }

  function handleMonthChange(nextMonth: number) {
    setMonth(nextMonth)
    setDataPromise(getDoanhSoData({ mode, year, month: nextMonth }))
  }

  const periodLabel = mode === "month" ? `Tháng ${month}/${year}` : `Năm ${year}`

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header & Filter Controls */}
        <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
              Thống kê doanh số xuất hàng
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Tổng hợp doanh thu từ phiếu xuất hàng ({periodLabel})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Toggle: Month vs Year */}
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => handleModeChange("month")}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition cursor-pointer ${
                  mode === "month"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Theo tháng
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("year")}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition cursor-pointer ${
                  mode === "year"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Theo năm
              </button>
            </div>

            {/* Month Selector (shown when mode === "month") */}
            {mode === "month" && (
              <select
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                aria-label="Chọn tháng"
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-2xs focus:outline-hidden"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            )}

            {/* Year Selector */}
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              aria-label="Chọn năm"
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-2xs focus:outline-hidden"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        </section>

        <Suspense key={`${mode}-${year}-${month}`} fallback={<DoanhSoSkeleton />}>
          <DoanhSoCharts dataPromise={dataPromise} periodLabel={periodLabel} />
        </Suspense>
      </div>
    </main>
  )
}
