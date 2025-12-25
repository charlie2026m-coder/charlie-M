
import { useState } from "react";
import { MdInfoOutline } from "react-icons/md";

import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip'
import { cn } from "@/lib/utils";

const CustomTooltip = ({ text, className }: { text: string, className?: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger 
        className={cn(className, "cursor-pointer")}
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
      >
        <MdInfoOutline className={`size-6 text-blue`} />
      </TooltipTrigger>
      <TooltipContent className=' text-base'>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default CustomTooltip;