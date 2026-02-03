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
  date: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Seleccionar fecha",
  disabled = false,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, "d MMM yyyy", { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            onSelect(newDate)
            setOpen(false)
          }}
          disabled={(d) => {
            if (minDate && d < minDate) return true
            if (maxDate && d > maxDate) return true
            return false
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// DatePickerString - works with string dates (YYYY-MM-DD format)
// Supports both keyboard input (DD/MM/YYYY) and calendar selection
interface DatePickerStringProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: string
  maxDate?: string
}

export function DatePickerString({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  disabled = false,
  className,
  minDate,
  maxDate,
}: DatePickerStringProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [month, setMonth] = React.useState<Date>(new Date())

  // Parse string to Date (using noon to avoid timezone issues)
  const date = value ? new Date(value + "T12:00:00") : undefined
  const minDateObj = minDate ? new Date(minDate + "T12:00:00") : undefined
  const maxDateObj = maxDate ? new Date(maxDate + "T12:00:00") : undefined

  // Sync input value when value prop changes
  React.useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00")
      if (!isNaN(d.getTime())) {
        const day = d.getDate().toString().padStart(2, "0")
        const m = (d.getMonth() + 1).toString().padStart(2, "0")
        const year = d.getFullYear()
        setInputValue(`${day}/${m}/${year}`)
      }
    } else {
      setInputValue("")
    }
  }, [value])

  // Handle popover open - set calendar to show the selected date's month
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && date && !isNaN(date.getTime())) {
      setMonth(date)
    }
    setOpen(isOpen)
  }

  // Handle keyboard input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value

    // Auto-format: add slashes as user types
    const digits = val.replace(/\D/g, "")
    if (digits.length <= 2) {
      val = digits
    } else if (digits.length <= 4) {
      val = `${digits.slice(0, 2)}/${digits.slice(2)}`
    } else {
      val = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
    }

    setInputValue(val)

    // Parse DD/MM/YYYY and update if valid
    const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      const [, day, month, year] = match
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0)

      // Validate the date is real (e.g., not 31/02/2024)
      if (
        parsedDate.getDate() === Number(day) &&
        parsedDate.getMonth() === Number(month) - 1 &&
        parsedDate.getFullYear() === Number(year)
      ) {
        onChange(format(parsedDate, "yyyy-MM-dd"))
      }
    }
  }

  // Clear on backspace when empty
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && inputValue === "") {
      onChange("")
    }
  }

  return (
    <div className={cn("flex gap-1", className)}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        maxLength={10}
      />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            month={month}
            onMonthChange={setMonth}
            onSelect={(newDate) => {
              if (newDate) {
                onChange(format(newDate, "yyyy-MM-dd"))
              }
              setOpen(false)
            }}
            disabled={(d) => {
              if (minDateObj && d < minDateObj) return true
              if (maxDateObj && d > maxDateObj) return true
              return false
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
