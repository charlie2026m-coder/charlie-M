
import { MdInfoOutline } from "react-icons/md";

import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip'

const CustomTooltip = ({ text, color }: { text: string, color: string }) => {
  return (
    <Tooltip>
      <TooltipTrigger>
        <MdInfoOutline className={`size-6 text-blue`} />
      </TooltipTrigger>
      <TooltipContent className='bg-brown text-[14px]'>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default CustomTooltip;