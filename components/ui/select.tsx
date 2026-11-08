"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon, SearchIcon } from "lucide-react"

function extractItemsFromNodes(nodes: React.ReactNode, map: Record<string, React.ReactNode> = {}) {
  React.Children.forEach(nodes, (child) => {
    if (!React.isValidElement(child)) return
    const childProps = child.props as {
      value?: unknown
      children?: React.ReactNode
    }
    if (childProps && childProps.value !== undefined && childProps.children !== undefined) {
      map[String(childProps.value)] = childProps.children
    }
    if (childProps?.children) {
      extractItemsFromNodes(childProps.children, map)
    }
  })
  return map
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

type SelectOpenContextValue = {
  open: boolean
  isTouchOpen: boolean
}

const SelectOpenContext = React.createContext<SelectOpenContextValue | null>(null)

const SELECT_ITEM_INDICATOR_RENDER = (
  <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
)

function Select<Value, Multiple extends boolean | undefined = false>({
  items,
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  highlightItemOnHover = false,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const [isTouchOpen, setIsTouchOpen] = React.useState(false)

  const open = openProp !== undefined ? openProp : uncontrolledOpen

  const resolvedItems = React.useMemo(() => {
    if (items) return items
    return extractItemsFromNodes(children)
  }, [items, children])

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean, eventDetails: SelectPrimitive.Root.ChangeEventDetails) => {
      onOpenChange?.(nextOpen, eventDetails)
      if (eventDetails.isCanceled) return
      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen)
      }
      const event = eventDetails.event as { pointerType?: string } | undefined
      setIsTouchOpen(nextOpen && event?.pointerType === "touch")
    },
    [onOpenChange, openProp],
  )

  const openContextValue = React.useMemo(
    () => ({
      open,
      isTouchOpen,
    }),
    [open, isTouchOpen],
  )

  return (
    <SelectOpenContext.Provider value={openContextValue}>
      <SelectPrimitive.Root
        items={resolvedItems}
        open={open}
        onOpenChange={handleOpenChange}
        highlightItemOnHover={highlightItemOnHover}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectOpenContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, children, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("block min-w-0 flex-1 truncate text-left", className)}
      {...props}
    >
      {children}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit min-w-0 max-w-full items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  searchable = true,
  searchPlaceholder = "Tìm kiếm...",
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  > & {
    searchable?: boolean
    searchPlaceholder?: string
  }) {
  const openContext = React.useContext(SelectOpenContext)
  const open = openContext?.open ?? false
  const isTouchOpen = openContext?.isTouchOpen ?? false

  const inputRef = React.useRef<HTMLInputElement>(null)
  const popupRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const emptyRef = React.useRef<HTMLDivElement>(null)
  const normalizedCacheRef = React.useRef(
    new WeakMap<HTMLElement, { raw: string; normalized: string }>(),
  )

  const applyFilter = React.useCallback((query: string) => {
    const list = listRef.current
    if (!list) return

    const normalizedQuery = normalizeSearchText(query)
    const options = list.querySelectorAll<HTMLElement>('[role="option"]')
    let visibleCount = 0

    for (let i = 0; i < options.length; i += 1) {
      const option = options[i]
      let matches = true

      if (normalizedQuery) {
        const textContent = option.textContent ?? ""
        const raw = textContent.trim()
          ? textContent
          : (option.dataset.searchLabel ?? "")
        let cached = normalizedCacheRef.current.get(option)
        if (!cached || cached.raw !== raw) {
          cached = { raw, normalized: normalizeSearchText(raw) }
          normalizedCacheRef.current.set(option, cached)
        }
        matches = cached.normalized.includes(normalizedQuery)
      }

      if (matches) {
        if (option.hasAttribute("data-filter-hidden")) {
          option.removeAttribute("data-filter-hidden")
        }
        visibleCount += 1
      } else if (!option.hasAttribute("data-filter-hidden")) {
        option.setAttribute("data-filter-hidden", "true")
      }
    }

    if (emptyRef.current) {
      emptyRef.current.classList.toggle(
        "hidden",
        !normalizedQuery || visibleCount > 0,
      )
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      if (inputRef.current) {
        inputRef.current.value = ""
      }
      if (popupRef.current) {
        popupRef.current.style.minWidth = ""
      }
      applyFilter("")
      return
    }

    let frame2: number | null = null
    const frame1 = requestAnimationFrame(() => {
      if (popupRef.current && popupRef.current.offsetWidth > 0) {
        popupRef.current.style.minWidth = `${popupRef.current.offsetWidth}px`
      }
      if (searchable && !isTouchOpen) {
        frame2 = requestAnimationFrame(() => {
          inputRef.current?.focus({ preventScroll: true })
        })
      }
    })

    const list = listRef.current
    const observer =
      searchable && list
        ? new MutationObserver(() => {
            applyFilter(inputRef.current?.value ?? "")
          })
        : null
    if (observer && list) {
      observer.observe(list, { childList: true })
    }

    return () => {
      cancelAnimationFrame(frame1)
      if (frame2 !== null) cancelAnimationFrame(frame2)
      observer?.disconnect()
    }
  }, [searchable, open, isTouchOpen, applyFilter])

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          ref={popupRef}
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-50 flex max-h-[min(var(--available-height),20rem)] w-max min-w-[max(var(--anchor-width),11rem)] max-w-[calc(100vw-2rem)] origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {searchable && (
            <div
              className="shrink-0 border-b border-border bg-popover p-1.5"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center">
                <SearchIcon className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  defaultValue=""
                  onChange={(e) => applyFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") return
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      e.stopPropagation()
                      const firstOption = listRef.current?.querySelector<HTMLElement>(
                        '[role="option"]:not([data-filter-hidden]):not([aria-disabled="true"])',
                      )
                      firstOption?.focus()
                      return
                    }
                    if (e.key === "Enter") {
                      e.preventDefault()
                    }
                    e.stopPropagation()
                  }}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-7 w-full min-w-0 rounded-md border border-input bg-background pr-2 pl-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
            </div>
          )}
          <SelectScrollUpButton />
          <SelectPrimitive.List
            ref={listRef}
            className="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-1 [scrollbar-gutter:stable]"
          >
            {children}
            <div
              ref={emptyRef}
              className="hidden px-2 py-3 text-center text-xs text-muted-foreground"
            >
              Không tìm thấy kết quả
            </div>
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  label,
  ...props
}: SelectPrimitive.Item.Props) {
  const fallbackSearchLabel =
    label ??
    (props.value !== undefined && props.value !== null
      ? String(props.value)
      : undefined)

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-search-label={fallbackSearchLabel}
      label={label}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-[filter-hidden=true]:hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator render={SELECT_ITEM_INDICATOR_RENDER}>
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full shrink-0 cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full shrink-0 cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
