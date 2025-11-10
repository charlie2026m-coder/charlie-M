import { Label } from "@/app/_components/ui/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/app/_components/ui/radio-group"

export function RadioGroupDemo({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: string[]
  value: string| null | boolean
  onChange: (value: string | null | boolean) => void
}) {

  return (
    <div className="flex gap-5">
      <h2 className="text-lg font-semibold">{title}</h2>

      <RadioGroup value={value?.toString() ?? ''} onValueChange={onChange} className="flex ">
        {options.map((option) => (
          <div key={option} className="flex items-center gap-3">
            <RadioGroupItem value={option} id={option} />
            <Label htmlFor={option} className="text-[17px] inter font-[400]">{option}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
