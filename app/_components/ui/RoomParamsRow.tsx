import { BsFillPersonFill } from 'react-icons/bs'
import { IoBedOutline } from "react-icons/io5";
import Image from 'next/image';

const RoomParamsRow = ({ attributes, maxPersons, size }: { attributes: string[], maxPersons: number, size: number }) => {
  const isKing = attributes?.includes('king');
  const isQueen = attributes?.includes('queen');
  const isBalcony = attributes?.includes('balcony');
  const isTerrace = attributes?.includes('terrace');
  const bedType = isKing ? 'King Size' : isQueen ? 'Queen Size' : 'Single';

  
  return (
    <div className='flex items-center gap-2'>
      <span className='text-dark text-sm flex items-center gap-1'> <BsFillPersonFill className='size-5 text-red' />{maxPersons} Max.</span>
      <Image src='/images/size-icon.svg' alt='size' width={20} height={20} className='size-5' />
      <span className='text-dark text'>{size}m²</span>
      <IoBedOutline className='size-5 text-red' />
      <span className='text-dark text'>{bedType}</span>
      {(isBalcony || isTerrace) && <>
        <Image src='/images/balcony-image.svg' alt='balcony' width={20} height={20} className='size-5' />
        <span className='text-dark text'>{isBalcony ? 'Balcony' : 'Terrace'}</span>
      </>}
      
    </div>
  )
}

export default RoomParamsRow