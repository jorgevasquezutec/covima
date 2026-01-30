"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Convertir string a Date si es necesario
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // Parsear string YYYY-MM-DD
    const parsed = new Date(value + "T00:00:00")
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "PPP", { locale: es })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          locale={es}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// Versión controlada que trabaja con strings YYYY-MM-DD (para formularios)
interface DatePickerStringProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePickerString({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled = false,
}: DatePickerStringProps) {
  const handleChange = (date: Date | undefined) => {
    if (date) {
      // Formatear como YYYY-MM-DD
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      onChange?.(`${year}-${month}-${day}`)
    } else {
      onChange?.("")
    }
  }

  return (
    <DatePicker
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  )
}
