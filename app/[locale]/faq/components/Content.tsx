'use client'
import { useState } from "react"
import FAQ from "./FAQ"
import Image from "next/image"
const Content = () => {
  const [activeFAQ, setActiveFAQ] = useState(0)

  //change images for each FAQ
  const images = [
    '/images/faq-man.svg',
    '/images/faq-man2.svg',
    '/images/faq-man3.svg',
    '/images/faq-man4.svg',
  ]
  const image = images[activeFAQ]

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-2 items-start min-h-[650px]'>
    <FAQ activeFAQ={activeFAQ} setActiveFAQ={setActiveFAQ} image={image} />
    <Image src={image} alt='faq' width={610} height={512} className='hidden lg:block w-full  rounded-[40px] object-cover ' />
  </div>
  )
}

export default Content