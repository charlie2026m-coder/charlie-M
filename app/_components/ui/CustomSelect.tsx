import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"

export function CustomSelect(
  {
    options,
    placeholder,
    value,
    onChange,
  }: {
    options: string[]
    placeholder: string
    value: string
    onChange: (value: string) => void
  }
) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-h-10 border-brown rounded-full w-[150px]">
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
