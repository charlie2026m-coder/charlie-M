"use client"

import { Input } from "./input";
import { FieldValues, UseFormRegister, Path, UseFormSetValue } from "react-hook-form";
import { cn } from "@/lib/utils";
import { PiCalendarBlankFill } from "react-icons/pi";
import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { Calendar } from "./calendar";
import dayjs from 'dayjs';


interface BirthdayInputProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  setValue?: UseFormSetValue<T>;
  name: Path<T>;
  placeholder: string;
  isError?: boolean;
  value?: string;
  className?: string;
}

function BirthdayInput<T extends FieldValues>({
  register,
  setValue,
  name,
  placeholder,
  isError,
  value,
  className,
}: BirthdayInputProps<T>) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date && setValue) {
      setSelectedDate(date);
      const formattedDate = dayjs(date).format('YYYY-MM-DD');
      setValue(name, formattedDate as any);
      // Не закрываем календарь автоматически
    }
  };

  const displayValue = selectedDate 
    ? dayjs(selectedDate).format('DD MMM YYYY')
    : '';
  
  return (
    <div className="relative">
      <PiCalendarBlankFill className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue z-10" />
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={displayValue}
              placeholder={placeholder}
              className={cn(
                "pl-[45px] bg-white h-10 rounded-full border-gray shadow-none cursor-pointer",
                isError && "!border-red text-red focus:border-red !ring-red/20 !focus:ring-red",
                className
              )}
              readOnly
              onClick={() => setOpen(!open)}
            />
            {/* Hidden input for react-hook-form */}
            <input
              type="hidden"
              {...register(name)}
            />
          </div>
        </PopoverTrigger>
        
        <PopoverContent
          className="max-w-[344px] !w-full rounded-[16px] bg-white"
          align="start"
          sideOffset={10}
        >
          <Calendar 
            required={false}
            mode="single"  
            captionLayout="dropdown"
            fromYear={1950}
            toYear={new Date().getFullYear()}
            selected={selectedDate ? selectedDate : undefined}
            onSelect={(date) => handleDateSelect(date as Date)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default BirthdayInput