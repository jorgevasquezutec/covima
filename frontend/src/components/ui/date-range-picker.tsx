"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  numberOfMonths?: number
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Seleccionar rango",
  className,
  disabled = false,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "dd MMM yyyy", { locale: es })} -{" "}
                {format(value.to, "dd MMM yyyy", { locale: es })}
              </>
            ) : (
              format(value.from, "dd MMM yyyy", { locale: es })
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          locale={es}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// Versión que trabaja con strings YYYY-MM-DD
interface DateRangePickerStringProps {
  valueFrom?: string
  valueTo?: string
  onChange?: (from: string, to: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  numberOfMonths?: number
}

export function DateRangePickerString({
  valueFrom,
  valueTo,
  onChange,
  placeholder = "Seleccionar rango",
  className,
  disabled = false,
  numberOfMonths = 2,
}: DateRangePickerStringProps) {
  // Convertir strings a DateRange
  const dateRange: DateRange | undefined = React.useMemo(() => {
    if (!valueFrom && !valueTo) return undefined
    return {
      from: valueFrom ? new Date(valueFrom + "T00:00:00") : undefined,
      to: valueTo ? new Date(valueTo + "T00:00:00") : undefined,
    }
  }, [valueFrom, valueTo])

  const handleChange = (range: DateRange | undefined) => {
    const formatDate = (date: Date | undefined) => {
      if (!date) return ""
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    onChange?.(formatDate(range?.from), formatDate(range?.to))
  }

  return (
    <DateRangePicker
      value={dateRange}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      numberOfMonths={numberOfMonths}
    />
  )
}
