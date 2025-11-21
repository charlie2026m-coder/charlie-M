import Image from 'next/image'  
const PosterSection = () => {
  return (
    <div className='container px-4 md:px-10 xl:px-[100px] py-[50px]'>
      <div className='flex items-center w-full h-[320px] md:h-[510px] rounded-[40px] flex-1 relative'  >
        <Image 
          src='/images/location-poster.jpg' 
          alt='location' 
          width={1230} 
          height={510} 
          className='rounded-[40px] w-full h-full object-cover' 
        />
        <div className='absolute top-0 left-0 w-full h-full bg-black/35 rounded-[40px] px-4 md:px-10 xl:px-[60px]  flex items-end md:items-center '>
          <h1 className='text-4xl md:text-6xl text-white text-center md:text-left w-full xl:w-1/2 z-10 font-bold jakarta pb-6'>Freedom meets comfort.</h1>
        </div>
      </div>
    </div>
  )
}

export default PosterSection