import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string // Format: "HH:mm"
  onChange: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showSeconds?: boolean
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className,
}: TimePickerProps) {
  return (
    <input
      type="time"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "h-10 px-3 py-2 rounded-md border border-input bg-background text-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  )
}
