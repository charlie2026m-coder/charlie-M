'use client'
import { BsFillPersonFill } from 'react-icons/bs'
import { IoBedOutline } from "react-icons/io5";
import { SlSizeFullscreen } from "react-icons/sl";
import { BsDoorOpen } from "react-icons/bs";

type RoomParamsTranslations = {
  max: string
  kingSize: string
  queenSize: string
  single: string
  balcony: string
  terrace: string
}

const RoomParamsRow = ({
  attributes,
  maxPersons,
  size,
  translations,
}: {
  attributes: string[]
  maxPersons: number
  size: number
  translations: RoomParamsTranslations
}) => {
  const isKing = attributes?.includes('king');
  const isQueen = attributes?.includes('queen');
  const isBalcony = attributes?.includes('balcony');
  const isTerrace = attributes?.includes('terrace');
  const bedType = isKing ? translations.kingSize : isQueen ? translations.queenSize : translations.single;

  return (
    <div className='flex items-center gap-2 mb-3 flex-wrap'>
      <span className='text-dark text-sm flex items-center gap-1'>
        <BsFillPersonFill className='size-5 text-blue' />{maxPersons} {translations.max}
      </span>
      <SlSizeFullscreen className='size-4 text-blue' />
      <span className='text-dark text'>{size}m²</span>
      <IoBedOutline className='size-5 text-blue' />
      <span className='text-dark text'>{bedType}</span>
      {(isBalcony || isTerrace) && <>
        <BsDoorOpen className='size-5 text-blue' />
        <span className='text-dark text'>{isBalcony ? translations.balcony : translations.terrace}</span>
      </>}
    </div>
  )
}

export default RoomParamsRow
