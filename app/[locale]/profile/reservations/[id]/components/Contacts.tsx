import Image from "next/image";
import { TbBrandWhatsappFilled } from "react-icons/tb";
import { IoMail } from "react-icons/io5";
const Contacts = () => {
  return (
    <div className='bg-gradient-to-r from-[#FFF6DF] to-[#EADCB0] flex flex-col lg:flex-row justify-between'>
      <div className='flex w-full px-2 lg:px-4 lg:w-3/5 xl:w-1/2  pt-3 items-center gap-6 '>
        <Image src='/images/help-man.svg' alt='upgrade room' width={90} height={175} className='w-[90px] h-full object-cover' />
        <div className=' text-mute'>
          <h3 className='font-semibold mb-3'>Need anything? We're right here.</h3>
          <p className='text-sm'>Our team is here 24/7 to make your stay smooth, simple, and stress-free. <br /> Reach out anytime — we’re just one click away.</p>
        </div>
      </div>

      <div className='flex flex-col gap-3 w-full lg:w-2/5 text-sm justify-center px-2 lg:px-8 py-5'>
        <a 
          href='https://wa.me/49XXXXXXXXX' 
          target='_blank' 
          rel='noopener noreferrer'
          className='flex flex-col px-5 py-2 border border-black rounded-3xl w-full cursor-pointer hover:bg-blue hover:border-blue hover:text-white'
        >
          <div className='flex items-center gap-2'>
            <TbBrandWhatsappFilled className='size-6' />
            <span>WhatsApp Us</span>
          </div>
          <span className='font-semibold'>+49 XXX XXXX XXX</span>
        </a>
        <a 
          href='mailto:hello@charliem.stay'
          className='flex flex-col px-5 py-2 border border-black rounded-3xl w-full cursor-pointer hover:bg-blue hover:border-blue hover:text-white'
        >
          <div className='flex items-center gap-2'>
            <IoMail className='size-6' />
            <span>Email Us</span>
          </div>
          <span className='font-semibold'>hello@charliem.stay</span>
        </a>

      </div>
  </div>
  )
}

export default Contacts