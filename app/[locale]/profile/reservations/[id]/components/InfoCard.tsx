import Image from 'next/image'
import { infoCardsContent } from '@/content/content'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog'
import { useState } from 'react'
import CardContent from './CardContent'

const InfoCard = ({ card }: { card: { id: number, title: string, image: string }}) => {
  const [open,setOpen] = useState(false)
  const { id, title, image } = card
  const content = infoCardsContent.find(content => content.id === id)
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='rounded-lg px-2 md:px-10 xl:px-25 w-[95%] md:w-4/5 max-w-[900px] max-h-[90vh] md:max-h-[85vh] overflow-y-auto top-[5%] md:top-[50%] translate-y-0 md:translate-y-[-50%]'>
          <DialogHeader>
            <DialogTitle className='text-2xl font-[500] text-mute inter text-center'>{card.title}</DialogTitle>
            <CardContent 
              images={content?.images || []} 
              description={content?.description || []} 
              card1={content?.card1} 
              card2={content?.card2} 
              id={id}
            />
          </DialogHeader>
        </DialogContent>
      </Dialog> 
    </>
  )
}

export default InfoCard