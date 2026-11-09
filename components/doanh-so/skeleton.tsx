export default function DoanhSoSkeleton() {
  const barWidths = ["w-11/12", "w-9/12", "w-7/12", "w-6/12", "w-4/12", "w-3/12"]

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards Skeleton */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200/80" />
            <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200/80" />
          </div>
        ))}
      </section>

      {/* 3 Chart Sections Skeleton */}
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <section key={sectionIdx} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-6 w-64 animate-pulse rounded-md bg-zinc-200/80" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-200/80" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200/80" />
          </div>

          {/* Horizontal Bars Skeleton */}
          <div className="space-y-3 rounded-xl border border-zinc-100 p-4">
            {barWidths.map((widthClass, barIdx) => (
              <div key={barIdx} className="flex items-center gap-4">
                <div className="h-4 w-36 shrink-0 animate-pulse rounded bg-zinc-200/80" />
                <div className={`h-7 ${widthClass} animate-pulse rounded-r-md bg-zinc-200/80`} />
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="h-10 w-full animate-pulse rounded-lg bg-zinc-200/80"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
