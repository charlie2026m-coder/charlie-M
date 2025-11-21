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

      <div className='container  px-4 md:px-10 xl:px-[100px] py-6 md:py-[70px] grid md:grid-cols-2 gap-[25px]'>
        <div className='col-span-1'>
          <div className='flex items-center gap-2 font-semibold text-[30px] md:text-[40px]  md:mb-[30px] '>
            <Dot size={20} color='blue'/>
            Lifestyle     
          </div>
          <div className='hidden md:flex flex-col gap-5 '>
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
        <div className='flex md:hidden flex-col gap-5 '>
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


      <div className='flex relative h-[550px] bg-brown'>
        <div className='container  px-4 md:px-10 xl:px-[100px] py-6 md:py-[35px] xl:pt-[70px]'>
          
          <h2 className='relative text-white text-[40px] md:text-5xl  xl:text-6xl font-bold jakarta w-full md:w-2/3 xl:w-1/2 z-30'>
            From Berlin’s history to today’s lifestyle - everything is just steps away
          </h2>
        </div>
        <div className='absolute h-[32px]  bg-brown -bottom-[30px] left-0 right-0'/>
        <div className='absolute h-[230px] md:hidden  bg-[#76665B] -bottom-[30px] left-0 right-0'/>
        <Image 
          src='/images/lifestyle-bg.svg' 
          alt='arrow' 
          width={854} 
          height={521} 
          className='absolute md:-bottom-4 bottom-50  right-0 w-full  lg:w-1/2  ' 
        />
        <div className='absolute h-[30px] bg-black -bottom-[30px] rounded-t-[30px] w-full z-20'/>
        <div className='absolute -bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px] z-30 '>
          <CheckInForm />
        </div>

      </div>
    </div>
  )
}

export default LifeStyle