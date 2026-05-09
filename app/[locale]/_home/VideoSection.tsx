import VideoPlayer from './components/VideoPlayer'
import CheckInForm from './components/CheckInForm'
import OriginalCheckInFormWrapper from './components/OriginalCheckInFormWrapper'

import Header from '@/app/_components/header/Header';
import { Button } from '@/app/_components/ui/button';
import { GoArrowRight } from "react-icons/go";
import { Link } from '@/navigation';
import { getTranslations } from 'next-intl/server';

const VideoSection = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale });

  return (
    <div className="w-full grid grid-cols-1 grid-rows-1">
      <VideoPlayer 
        videoSrc="https://sbohsfnalbugtasmzemo.supabase.co/storage/v1/object/public/videos/video.mp4" 
        className="aspect-video w-full h-[calc(100vh-44px)] max-h-[480px] lg:max-h-[800px] col-start-1 row-start-1" 
      />
      <div className='flex flex-col col-start-1 row-start-1 bg-black/50 items-center pb-20 z-10 px-4'>
        <Header locale={locale} isWhite={true} />
        <h1 className='text-white text-3xl md:text-5xl font-bold jakarta text-center mb-4 md:mb-2.5 mt-auto'>{t('home.video.title')}</h1>
        
        <h2 className='flex items-center text-white w-2/3 md:w-auto text-lg md:text-4xl font-bold jakarta text-center mb-8'>
          {t('home.video.subtitle')}
        </h2>
        <Link href='/rooms'  >       
          <Button 
            variant='outline' 
            className='border-white  hover:border-white/50 text-white hover:text-white/50 active:bg-white/50 active:text-white/50 h-14 px-10 mb-8'> 
            {t('home.video.exploreRooms')}
            <GoArrowRight className='size-5' />
          </Button>
        </Link>
        <OriginalCheckInFormWrapper>
          <CheckInForm />
        </OriginalCheckInFormWrapper>
      </div>
    </div>
  )
}

export default VideoSection