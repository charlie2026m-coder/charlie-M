import Image from "next/image"
import CheckInForm from "@/app/_components/Home/CheckInForm"
const LifeStyle = () => {

  return (
    <div className='flex flex-col '>
      <div className='flex relative h-[700px]  md:h-[550px] bg-light1'>
        <div className='container relative flex  px-4 md:px-10 xl:px-[100px] pt-6 md:pt-[35px] xl:pt-[70px]'>
          
          <h2 className='relative text-[40px] md:text-5xl  xl:text-6xl font-bold jakarta w-full md:w-2/3 xl:w-1/2 z-10'>
            From Berlin’s history to today’s lifestyle - everything is just steps away
          </h2>
          <Image 
            src='/images/location-man.svg' 
            alt='arrow' 
            width={854}
            height={521}
            className='object-contain object-right object-bottom absolute bottom-40 md:-bottom-4 right-0 ' 
          />
        </div>
        
          <div className='absolute h-[30px] bg-black -bottom-[30px] rounded-t-[30px] bg-mute w-full z-20'/>
        
        <div className='absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px] z-30 '>
          <CheckInForm />
        </div>

      </div>
    </div>
  )
}

export default LifeStyle