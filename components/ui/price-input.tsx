"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PriceInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "defaultValue"> {
  value?: string | number | null
  defaultValue?: string | number | null
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onValueChange?: (rawValue: string, numericValue: number) => void
}

function cleanToDigits(val: string | number | null | undefined): string {
  if (val == null || val === "") return ""
  let str = String(val).replace(/\D/g, "")
  if (str.length > 1 && str.startsWith("0")) {
    str = str.replace(/^0+/, "") || "0"
  }
  return str
}

function formatWithCommas(digits: string): string {
  if (!digits) return ""
  return new Intl.NumberFormat("en-US").format(Number(digits))
}

function computeCursorPosition(
  rawInput: string,
  cursorPosition: number,
  formatted: string
): number {
  const textBeforeCursor = rawInput.slice(0, cursorPosition)
  const digitsBeforeCursor = textBeforeCursor.replace(/\D/g, "").length

  if (digitsBeforeCursor === 0) return 0

  let count = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count++
    }
    if (count === digitsBeforeCursor) {
      return i + 1
    }
  }
  return formatted.length
}

export const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      onValueChange,
      name,
      required,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null)
    const isControlled = value !== undefined

    // For uncontrolled mode
    const [internalRaw, setInternalRaw] = React.useState<string>(() =>
      cleanToDigits(defaultValue)
    )

    const rawValue = isControlled ? cleanToDigits(value) : internalRaw
    const displayValue = formatWithCommas(rawValue)

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }
      },
      [ref]
    )

    const triggerChange = (newRaw: string, targetInput: HTMLInputElement) => {
      if (!isControlled) {
        setInternalRaw(newRaw)
      }

      onValueChange?.(newRaw, newRaw ? Number(newRaw) : 0)

      if (onChange) {
        // Create synthetic event with raw digits as target.value so handlers get clean numbers
        const originalValue = targetInput.value
        targetInput.value = newRaw
        const event = {
          target: targetInput,
          currentTarget: targetInput,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLInputElement>
        onChange(event)
        targetInput.value = originalValue
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target
      const rawTyped = input.value
      const cursorPos = input.selectionStart ?? rawTyped.length

      const cleanDigits = cleanToDigits(rawTyped)
      const formatted = formatWithCommas(cleanDigits)

      const nextCursorPos = computeCursorPosition(rawTyped, cursorPos, formatted)

      requestAnimationFrame(() => {
        if (internalRef.current) {
          internalRef.current.setSelectionRange(nextCursorPos, nextCursorPos)
        }
      })

      triggerChange(cleanDigits, input)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = internalRef.current
      if (!input) {
        onKeyDown?.(e)
        return
      }

      // Handle Backspace directly after a comma
      if (e.key === "Backspace" && input.selectionStart === input.selectionEnd) {
        const pos = input.selectionStart
        if (pos !== null && pos > 1 && input.value[pos - 1] === ",") {
          e.preventDefault()
          const before = input.value
          // Delete the character before the comma
          const after = before.slice(0, pos - 2) + before.slice(pos - 1)
          const cleanDigits = cleanToDigits(after)
          const formatted = formatWithCommas(cleanDigits)

          const nextCursorPos = computeCursorPosition(
            before.slice(0, pos - 2) + before.slice(pos),
            pos - 2,
            formatted
          )

          requestAnimationFrame(() => {
            if (internalRef.current) {
              internalRef.current.setSelectionRange(nextCursorPos, nextCursorPos)
            }
          })

          triggerChange(cleanDigits, input)
          return
        }
      }

      // Handle Delete directly before a comma
      if (e.key === "Delete" && input.selectionStart === input.selectionEnd) {
        const pos = input.selectionStart
        if (pos !== null && pos < input.value.length && input.value[pos] === ",") {
          e.preventDefault()
          const before = input.value
          // Delete the digit after the comma
          const after = before.slice(0, pos) + before.slice(pos + 2)
          const cleanDigits = cleanToDigits(after)
          const formatted = formatWithCommas(cleanDigits)

          const nextCursorPos = computeCursorPosition(
            before.slice(0, pos),
            pos,
            formatted
          )

          requestAnimationFrame(() => {
            if (internalRef.current) {
              internalRef.current.setSelectionRange(nextCursorPos, nextCursorPos)
            }
          })

          triggerChange(cleanDigits, input)
          return
        }
      }

      onKeyDown?.(e)
    }

    return (
      <>
        {name && <input type="hidden" name={name} value={rawValue} />}
        <input
          ref={setRefs}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          required={required}
          className={cn(className)}
          {...props}
        />
      </>
    )
  }
)

PriceInput.displayName = "PriceInput"
