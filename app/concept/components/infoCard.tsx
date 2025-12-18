'use client'
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog"
import CardContent from './CardContent'
import { infoCardsContent } from '@/content/content'

const infoCard = ({ card }: { card: { id: number, title: string, subTitle: string, icon: React.ReactNode } }) => {
  const [open,setOpen] = useState(false)

  const content = infoCardsContent.find(content => content.id === card.id)
  return (
    <>
      <div key={card.id} onClick={() => setOpen(!open)} className='flex group hover:bg-blue cursor-pointer flex-col items-center md:flex-row px-2 md:px-5 py-10 bg-white items-center  rounded-lg transition-all duration-300 '>
        <div className='flex gap-2 flex-col md:flex-row items-center'>
          <div className='size-[70px] min-w-[70px] group-hover:bg-white rounded-full bg-blue flex items-center self-center justify-center transition-all duration-300'>
            {card.icon}
          </div>
          <div className='flex flex-col gap-1'>
            <h3 className='md:text-2xl font-[500] text-center md:text-start text-mute inter'>{card.title}</h3>
            <p className='md:text-base text-sm text-center md:text-start text-mute inter'>{card.subTitle}</p>
          </div>
        </div>
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
              id={card.id}
              />
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default infoCard