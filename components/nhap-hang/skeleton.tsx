export default function NhapHangSkeleton() {
  return (
    <div className="w-full space-y-3 p-4 sm:p-6">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="h-12 w-full animate-pulse rounded-lg bg-zinc-200/80"
        />
      ))}
    </div>
  )
}
