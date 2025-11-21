import { Button } from '@/app/_components/ui/button'
import Link from 'next/link'

const notFound = () => {
  return (
    <section className='flex flex-col items-center justify-center  min-h-[500px] pb-[60px] pt-9'>
      <div 
        className='flex flex-col items-center justify-end w-full h-full bg-contain  md:w-4/5 lg:w-3/5 pt-[150px] md:pt-[300px]'
        style={{
          backgroundImage: `url('/images/404.png')`,
          backgroundPosition: 'top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <h1 className='text-[40px] font-semibold text-center mb-3'>ERROR</h1>
        <p className='text-center text-sm md:text-lg text-dark mb-5 md:mb-12'>Uh, we can't seem to find the page you're looking for.</p>
        <Link href="/" className='text-center text-lg '>
          <Button className='text-center text-lg w-[300px]'>Back to Homepage</Button>
        </Link>
      </div>
    </section>
  )
}

export default notFound