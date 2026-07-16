'use client'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog'
import { useState } from 'react'
import CardContent from './CardContent'
import { useTranslations } from 'next-intl'

// Images for each information card
const INFO_CARD_IMAGES: Record<number, string[]> = {
  1: ['/images/exp-1.webp'],
  2: ['/images/profile/luggage.webp'],
  3: ['/images/profile/self-service.webp'],
  4: ['/images/profile/laundry.webp'],
  5: ['/images/profile/coffee-machine.webp'],
  6: ['/images/wifi-image.webp'],
  7: ['/images/profile/lost.webp'],
  8: ['/images/profile/room-refresh.webp'],
  9: ['/images/profile/garbage.webp']
}

const InfoCard = ({ card }: { card: { id: number, title: string, image: string }}) => {
  const t = useTranslations('profile')
  const [open,setOpen] = useState(false)
  const { id, title, image } = card
  
  // Get images for this card
  const images = INFO_CARD_IMAGES[id] || []
  
  // Get translated content with safe key checking
  const getTranslatedContent = () => {
    const contentKey = `infoContent.${id}`
    
    // Get all content for this card
    const allContent = t.raw(contentKey) as any
    
    // Safely extract each field
    const description = Array.isArray(allContent?.description) ? allContent.description : []
    const card1 = Array.isArray(allContent?.card1) ? allContent.card1 : undefined
    const card2 = Array.isArray(allContent?.card2) ? allContent.card2 : undefined
    
    return {
      description,
      card1,
      card2
    }
  }
  
  const content = getTranslatedContent()
  return (
    <>
      <div 
        onClick={() => setOpen(!open)}
        className='flex flex-col items-center py-8 border border-light1 rounded-2xl group hover:bg-blue hover:text-white cursor-pointer px-2 transition-all duration-500'
      >
        <div className='size-[50px] min-w-[50px] mb-3 group-hover:bg-white rounded-full bg-blue flex items-center self-center justify-center transition-all duration-500'>
          <Image src={image} className='object-cover size-6' width={25} alt='concept-image' height={25}/>
        </div>
        <h4 className='font-semibold text-center'>{title}</h4>
      </div>
      {/* The dialog frame must NOT scroll itself: shadcn's ✕ is absolutely
          positioned inside DialogContent, so with overflow-y-auto on it the
          button scrolled away with the content and phones were left with no
          way to close. Scroll lives on an inner div; ✕ stays pinned. 85dvh
          (not 90vh): static vh ignores the iOS URL bar and clipped the bottom. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='flex flex-col overflow-hidden p-0 rounded-lg w-[95%] md:w-4/5 max-w-[900px] max-h-[85dvh] top-[5%] md:top-[50%] translate-y-0 md:translate-y-[-50%]'>
          <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 md:px-10 xl:px-25 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]'>
            <DialogHeader>
              <DialogTitle className='text-2xl font-[500] text-mute inter text-center'>{card.title}</DialogTitle>
              <CardContent
                images={images}
                description={content.description}
                card1={content.card1}
                card2={content.card2}
                id={id}
              />
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default InfoCard