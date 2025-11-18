import Image from 'next/image'
import { Guests } from '@/app/_components/ui/guests'
import { Button } from '@/app/_components/ui/button'
import { useBookingStore } from '@/store/bookingStore'


const AddRooms = ({ maxAdults, maxChildren }: { maxAdults: number, maxChildren: number }) => {
  const { booking, setBooking } = useBookingStore()

  const removeRoom = (id: number) => {
    setBooking({ ...booking, rooms: booking.rooms.filter((room) => room.id !== id) })
  }

  const addGuests = (id: number, guests: { adults: number, children: number }) => {

    //here we need to  guests for rooms for each unit of room
    const newRooms = booking.rooms.map((room) => room.id === id ? {
      ...room, 
      adults: guests.adults, 
      children: guests.children 
    } : room)

    //here we calculate total amount of guests for all rooms
    const newGuests = newRooms.reduce((acc, room) => {
      acc.adults += room.adults
      acc.children += room.children
      return acc
    },  {adults: 0, children: 0})

    //here we update the booking with the new rooms and guests
    setBooking({ ...booking, rooms: newRooms, guests: newGuests })
  }

  const addRoom = () => {
    const newRoom = { id: booking.rooms[booking.rooms.length - 1].id + 1, adults: 1, children: 0 }
    setBooking({ ...booking, rooms: [...booking.rooms, newRoom] })
  }

  return (
    <div className='flex flex-col gap-3 py-6 pb-4 border-b'>
      {booking.rooms.map((item, index) =>{
        return (  
          <div key={item.id} className='flex items-center gap-2'>
            <Image 
              src={'/images/room.jpg'} 
              alt={booking.name || ''} 
              width={42} 
              height={42} 
              className='size-10 rounded-lg object-cover' 
            />
            <div className='truncate'>
              {booking.name}
            </div>
            <div className='flex items-center gap-2 ml-auto'>
              <Guests
                maxAdults={maxAdults}
                maxChildren={maxChildren}
                setValue={(guests) => addGuests(item.id, guests)} 
                value={item} 
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