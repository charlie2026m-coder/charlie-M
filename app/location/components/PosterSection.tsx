import Image from 'next/image'  
const PosterSection = () => {
  return (
    <div className='container px-[100px] py-[50px]'>
      <div className='flex items-center w-full h-[510px] rounded-[40px] flex-1 relative'  >
        <Image 
          src='/images/location-poster.jpg' 
          alt='location' 
          width={1230} 
          height={510} 
          className='rounded-[40px] w-full h-full object-cover' 
        />
        <div className='absolute top-0 left-0 w-full h-full bg-black/35 rounded-[40px]  px-[60px]  flex items-center '>
          <h1 className='text-6xl text-white w-1/2 z-10 font-bold jakarta'>Freedom meets comfort.</h1>
        </div>
      </div>
    </div>
  )
}

export default PosterSection