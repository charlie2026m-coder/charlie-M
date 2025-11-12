import Image from 'next/image'
import { Guests } from '@/app/_components/ui/guests'
import { Button } from '@/app/_components/ui/button'
const AddRooms = ({
  rooms,
  setRooms,
}: {  
  rooms: { id: number, image: string, name: string, guests: { adults: number, children: number }, price: number, days: number }[]
  setRooms: (rooms: { id: number, image: string, name: string, guests: { adults: number, children: number }, price: number, days: number }[]) => void
}) => {

  const addRoom = () => {
    setRooms([...rooms, {
      id: rooms.length + 1,
      image: '/images/room.jpg',
      name: 'Room '+(rooms.length + 1),
      guests: { adults: 2, children: 0 },
      price: 75,
      days: 5,
    }])
  }
  const removeRoom = (id: number) => {
    setRooms(rooms.filter((room) => room.id !== id))
  }

  const addGuests = (id: number, guests: { adults: number, children: number }) => {
    setRooms(rooms.map((room) => room.id === id ? { ...room, guests: { adults: guests.adults, children: guests.children } } : room))
  }
  return (
    <div className='flex flex-col gap-3 py-6 pb-4 border-b'>
      {rooms.map((item, index) =>{
        return (
          <div key={item.id} className='flex items-center gap-2'>
            <Image 
              src={item.image} 
              alt={item.name} 
              width={42} 
              height={42} 
              className='size-10 rounded-lg object-cover' 
            />
            <div className='truncate'>
              {item.name}
            </div>
            <div className='flex items-center gap-2 ml-auto'>
              <Guests 
                setValue={(guests) => addGuests(item.id, guests)} 
                value={item.guests as { adults: number, children: number }} 
                className='!max-w-[120px]'
              />
              <Image src="/images/delete-icon.svg" alt="close" width={20} height={20} className='size-5 cursor-pointer' onClick={() => removeRoom(item.id)} />
            </div>
          </div>
        )
      })}
      <Button variant="outline" className='w-full' onClick={addRoom}>+ Add Room</Button>  
    </div>
  )
}

export default AddRooms