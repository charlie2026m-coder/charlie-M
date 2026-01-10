import { BsFillPersonFill } from 'react-icons/bs'
import { IoBedOutline } from "react-icons/io5";
import { SlSizeFullscreen } from "react-icons/sl";
import { BsDoorOpen } from "react-icons/bs";

const RoomParamsRow = ({ attributes, maxPersons, size }: { attributes: string[], maxPersons: number, size: number }) => {
  const isKing = attributes?.includes('king');
  const isQueen = attributes?.includes('queen');
  const isBalcony = attributes?.includes('balcony');
  const isTerrace = attributes?.includes('terrace');
  const bedType = isKing ? 'King Size' : isQueen ? 'Queen Size' : 'Single';

  
  return (
    <div className='flex items-center gap-2'>
      <span className='text-dark text-sm flex items-center gap-1'> <BsFillPersonFill className='size-5 text-blue' />{maxPersons} Max.</span>
      <SlSizeFullscreen className='size-4 text-blue' />
      <span className='text-dark text'>{size}m²</span>
      <IoBedOutline className='size-5 text-blue' />
      <span className='text-dark text'>{bedType}</span>
      {(isBalcony || isTerrace) && <>
        <BsDoorOpen className='size-5 text-blue' />
        <span className='text-dark text'>{isBalcony ? 'Balcony' : 'Terrace'}</span>
      </>}
      
    </div>
  )
}

export default RoomParamsRow