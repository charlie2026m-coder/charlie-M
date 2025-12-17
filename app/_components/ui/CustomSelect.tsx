import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import { cn } from "@/lib/utils"

export function CustomSelect(
  {
    options,
    placeholder,
    value,
    onChange,
    className,
  }: {
    options: string[]
    placeholder: string
    value: string
    onChange: (value: string) => void
    className?: string
  }
) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("min-h-10 border-brown rounded-full w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
