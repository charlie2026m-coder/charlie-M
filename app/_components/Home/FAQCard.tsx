import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

interface FAQCardProps {
  question: string
  answer: string
  active: boolean
  setActiveTab: (index: number) => void
  index: number
}

const FAQCard = ({ question, answer, active, setActiveTab, index }: FAQCardProps) => {
  return (
    <div 
      className={`w-full relative border rounded-xl p-4 cursor-pointer transition-all duration-300 ${active ? 'border-blue bg-blue/50' : 'border-brown bg-white'}`}
      onClick={() => setActiveTab(index)}
    >
      <div className="flex items-start justify-between pr-8">
        {question}
        {active ? <IoIosArrowUp className={icon} /> : <IoIosArrowDown className={icon} />}
      </div>
      
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="mt-2.5 text-xs">{answer}</p>
        </div>
      </div>
    </div>
  )
}

export default FAQCard

const icon = 'text-brown size-4 absolute top-5 right-5'