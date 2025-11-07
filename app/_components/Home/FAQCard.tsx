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
      className={`w-full relative border  rounded-xl p-4 cursor-pointer ${active ? 'border-blue bg-blue' : 'border-brown bg-white'}`}
      onClick={() => setActiveTab(index)}
    >
      {question}
      {active ? <IoIosArrowUp className={icon} /> : <IoIosArrowDown className={icon} />}
      {active && <p className="mt-2.5 text-xs">{answer}</p> }
    </div>
  )
}

export default FAQCard

const icon = 'text-brown size-4 absolute top-5 right-5'