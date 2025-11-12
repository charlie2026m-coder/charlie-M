import Dot from "@/app/_components/ui/dot"
import { FaWalking } from "react-icons/fa"
import Image from "next/image"
import CheckInForm from "@/app/_components/Home/CheckInForm"
const LifeStyle = () => {

  const items = [
    {
      title:'Tiergarten',
      time:15,
    },
    {
      title:'Spree walks',
      time:15,
    },
    {
      title:'Brandenburg gate',
      time:15,
    }
]
  return (
    <div className='flex flex-col '>
      <div className='container px-[100px] py-[70px] grid grid-cols-2 gap-[28px]'>
        <div className='col-span-1'>
          <div className='flex items-center gap-2 font-semibold text-[40px] mb-[30px] '>
            <Dot size={20} color='blue'/>
            Lifestyle     
          </div>
          <div className='flex flex-col gap-5 '>
            {items.map((item) => (
              <div key={item.title} className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
                <FaWalking size={24} className='mr-2 text-brown' />
                {item.title}
                <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                  {item.time} min
                </div>
              </div>
            ))}

          </div>
        </div>
        <div className='col-span-1'>
          <Image 
            src='/images/lifestyle.jpg' 
            alt='life-style' 
            width={593} 
            height={372} 
            className='w-full h-[372px] object-cover rounded-[30px]' 
          />
        </div>

      </div>
      <div className='flex relative h-[550px] bg-brown'>
        <div className='container px-[100px] py-[70px]'>
          
          <h2 className='text-white text-6xl font-bold jakarta w-1/2'>
          From Berlin’s history to today’s lifestyle - everything is just steps away
          </h2>
        </div>
        <Image 
          src='/images/lifestyle-bg.svg' 
          alt='arrow' 
          width={854} 
          height={521} 
          className='absolute top-[50px] -right-5 w-3/5 h-[521px] z-10 ' 
        />
        <div className='absolute h-[30px] bg-brown -bottom-[30px] left-0 right-0'/>
        <div className='absolute h-[30px] bg-black -bottom-[30px] rounded-t-[30px] w-full z-20'/>
        <div className='absolute -bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px] z-30'>
          <CheckInForm />
        </div>

      </div>
    </div>
  )
}

export default LifeStyle