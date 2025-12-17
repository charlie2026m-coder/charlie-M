import FAQ from "./components/FAQ"
import Image from "next/image"
const FAQPage = () => {
  return (
    <div className='container flex flex-1 flex-col min-h-[500px]  px-4 md:px-10 xl:px-25 pt-10 lg:pt-15 pb-10 lg:pb-15'>
      <h1 className='text-3xl text-mute md:text-6xl font-bold jakarta mb-20 text-center'>Frequently Asked Questions</h1>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-2 items-start'>
        <FAQ />
        <Image src='/images/faq-man.svg' alt='faq' width={610} height={512} className='hidden lg:block w-full  rounded-[40px] object-cover ' />
      </div>
    </div>  
  )
}

export default FAQPage


