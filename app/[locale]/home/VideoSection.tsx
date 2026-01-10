import VideoPlayer from './components/VideoPlayer'
import CheckInForm from './components/CheckInForm'
import Discount from '../../_components/ui/Discount';

import Header from '@/app/_components/header/Header';
import Dot from '@/app/_components/ui/dot';
import { Button } from '@/app/_components/ui/button';
import { GoArrowRight } from "react-icons/go";

const VideoSection = ({ locale }: { locale: string }) => {

  return (
    <div className="w-full grid grid-cols-1 grid-rows-1">
      <VideoPlayer 
        videoSrc="https://sbohsfnalbugtasmzemo.supabase.co/storage/v1/object/public/videos/video.mp4" 
        className="aspect-video w-full h-[800px] col-start-1 row-start-1" 
      />
      <div className='flex flex-col col-start-1 row-start-1 bg-black/50 items-center pb-8 z-10'>
        <Discount />
        <Header locale={locale} isWhite={true} />
        <h1 className='text-white text-5xl font-bold jakarta text-center mt-auto mb-3'>Charlie M - Your Berlin story starts here</h1>
        <h2 className='flex items-center gap-3 text-white text-4xl font-bold jakarta text-center mb-8'>Fully automated stay <Dot size={10} color='white' /> Central of Berlin</h2>
        <Button 
          variant='outline' 
          className='border-white hover:border-white/50 text-white hover:text-white/50 h-14 px-10 mb-8'> 
          Explore rooms 
          <GoArrowRight className='size-5' />
        </Button>
        <CheckInForm />
      </div>
    </div>
  )
}

export default VideoSection