import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { cn } from "@/lib/utils";
interface FAQCardProps {
  question: string
  items: string[]
  active: boolean
  setActiveTab: (index: number) => void
  index: number
}

const FAQCard = ({ question, items, active, setActiveTab, index }: FAQCardProps) => {
  return (
    <div 
      className={`w-full relative border rounded-xl p-4 cursor-pointer transition-all duration-300 ${active && 'bg-light-bg'}`}
      onClick={() => setActiveTab(index)}
    >
      <div className={cn("flex items-start justify-between pr-8", active && 'font-bold')}>
        {question}
        {active ? <IoIosArrowUp className={icon} /> : <IoIosArrowDown className={icon} />}
      </div>
      
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className={cn("overflow-hidden border-t border-[#E0E0E0] ", active && 'mt-2')}>
          {items.map((item, index) => (
            <p className="mt-2.5 text-xs" key={index}>
              {item.split('**').map((part, i) => 
                i % 2 === 0 ? part : <strong key={i}>{part}</strong>
              )}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FAQCard

const icon = 'text-brown size-4 absolute top-5 right-5'