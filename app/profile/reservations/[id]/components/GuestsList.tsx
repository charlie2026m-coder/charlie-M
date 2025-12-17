import { useState } from 'react'
import { IoIosArrowDown } from 'react-icons/io'
import GuestCard from './GuestCard'

const GuestsList = () => {
  const [showGuests, setShowGuests] = useState(true)
  return (
    <>
      <div 
        className='flex items-center gap-2 text-lg font-semibold w-full cursor-pointer pb-2.5 border-b' 
        onClick={() => setShowGuests(!showGuests)}
      >
        Guests: 
        <IoIosArrowDown 
          className={`size-5 ml-auto transition-transform duration-300 ${showGuests ? 'rotate-180' : ''}`} 
        />
      </div>
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          showGuests ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 mb-5'
        }`}
      >
        <div className='flex flex-col gap-5 mb-8  pt-5'>
          {guests.map((guest) => (
              <GuestCard key={guest.name} name={guest.name} birthdate={guest.birthdate} id={guest.id} nationality={guest.nationality} address={guest.address} />
          ))}
        </div>
      </div>
    </>
  )
}

export default GuestsList;

const guests = [
  {
    name: 'John Doe',
    birthdate: '1990-01-01',
    id: '1234567890',
    nationality: 'USA',
    address: '123 Main St, Anytown, USA',
  },
  {
    name: 'Anna Doe',
    birthdate: '1990-01-01',
    id: '1234567890',
    nationality: 'USA',
    address: '123 Main St, Anytown, USA',
  },
  {
    name: 'Bob Doe',
    birthdate: '1990-01-01',
    id: '1234567890',
    nationality: 'USA',
    address: '123 Main St, Anytown, USA',
  },
]