import * as React from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(className)}
      nativeButton={false}
      render={
        <a
          aria-current={isActive ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  )
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("pl-1.5!", className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("pr-1.5!", className)}
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon
      />
      <span className="sr-only">More pages</span>
    </span>
  )
}

function TablePagination({
  page,
  total,
  pageSize = 10,
  onPageChangeAction,
}: {
  page: number
  total: number
  pageSize?: number
  onPageChangeAction?: (newPage: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(1, page), pageCount)

  if (pageCount <= 1) return null

  function commitPage(rawValue: string, inputEl: HTMLInputElement) {
    const parsed = Number.parseInt(rawValue.trim(), 10)
    if (Number.isNaN(parsed)) {
      inputEl.value = String(currentPage)
      return
    }
    const targetPage = Math.min(Math.max(1, parsed), pageCount)
    inputEl.value = String(targetPage)
    if (targetPage !== currentPage) {
      onPageChangeAction?.(targetPage)
    }
  }

  return (
    <div className="sticky bottom-0 z-10 border-t border-zinc-100 bg-white p-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Trước"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage > 1) onPageChangeAction?.(currentPage - 1)
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <div className="flex items-center gap-1.5 px-3 text-sm text-zinc-600">
              <span>Trang</span>
              <input
                key={currentPage}
                type="number"
                min={1}
                max={pageCount}
                defaultValue={currentPage}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commitPage(e.currentTarget.value, e.currentTarget)
                  }
                }}
                onBlur={(e) => commitPage(e.currentTarget.value, e.currentTarget)}
                aria-label="Số trang"
                className="h-8 w-14 rounded-md border border-zinc-300 bg-white px-2 text-center text-sm font-medium text-zinc-900 focus:border-zinc-900 focus:outline-none"
              />
              <span>/ {pageCount}</span>
            </div>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              text="Sau"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage < pageCount) onPageChangeAction?.(currentPage + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  TablePagination,
}
