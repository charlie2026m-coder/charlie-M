import { BsFillPersonFill } from 'react-icons/bs'
import { Beds24RoomType } from '@/types/beds24'
import Dot from './dot'
import { IoBedOutline } from "react-icons/io5";
import Image from 'next/image';
const RoomParamsRow = ({item }: { item: Beds24RoomType }) => {
  return (
    <div className='flex items-center gap-1'>
      <span className='text-dark text-sm flex items-center gap-1'> <BsFillPersonFill className='size-5 text-red' />{item.people} Max.</span>
      <Image src='/images/size-icon.svg' alt='size' width={20} height={20} className='size-5' />
      <span className='text-dark text'>{item.roomSize}m²</span>
      <IoBedOutline className='size-5 text-red' />
      <span className='text-dark text'>{item.roomType}</span>
      {item.hasBalcony && <>
        <Image src='/images/balcony-image.svg' alt='balcony' width={20} height={20} className='size-5' />
        <span className='text-dark text'>Balcony</span>
      </>}
    </div>
  )
}

export default RoomParamsRow