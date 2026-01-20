import { FaPlus, FaCheck } from "react-icons/fa6";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/_components/ui/popover"
import { Label } from "@/app/_components/ui/label";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { Button } from "@/app/_components/ui/button";
import { useState, useEffect } from "react";
import { useBookingStore } from "@/store/useBookingStore";
import { Service } from "@/types/apaleo";


const AddExtraButton = ({extra}:{extra: Service}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const setRooms = useBookingStore( state => state.setRooms )
  const rooms = useBookingStore(state => state.rooms)
  
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  useEffect(() =>{
    setSelectedRooms(
      rooms.filter(room => room.extras?.some(e => e.id === extra.id)).map(room => room.id)
    )
  }, [rooms, extra.id])
  
  const handleAddExtra = (selectedRooms: string[]) => {
    const newRooms = rooms.map(room => {
      const currentExtras = room.extras || []
      
      if (selectedRooms.includes(room.id)) {
        const newExtra = {
          roomId: room.id,
          currency: extra.currency,
          price: extra.price,
          name: extra.name,
          id: extra.id,
          pricingType: extra.pricingType,
          pricingUnit: extra.pricingUnit,
          daysOfWeek: extra.daysOfWeek,
        }
        const hasExtra = currentExtras.some(e => e.id === extra.id)
        if (!hasExtra) {
          return { ...room, extras: [...currentExtras, newExtra] }
        }
      } else {
        const hasExtra = currentExtras.some(e => e.id === extra.id)
        if (hasExtra) {
          return { ...room, extras: currentExtras.filter(e => e.id !== extra.id) }
        }
      }
      
      return room
    })
    
    setRooms(newRooms)
    setIsDone(true)
    
    setTimeout(() => {
      setIsDone(false)
      setIsOpen(false)
    }, 300)
  }

  const handleSelectRoom = (roomId: string) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId) // Remove if exists
        : [...prev, roomId] // Add if doesn't exist
    )
  }
  const handleCancel = () => {
    setIsOpen(false)
    setSelectedRooms([])
    setIsDone(false)
  }
  useEffect(() => {
    if (isOpen) {
      setIsDone(false)
    }
  }, [isOpen])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
    <PopoverTrigger asChild>
      <div className='absolute flex top-2.5 right-2.5 items-center justify-center  rounded transition-all duration-300 cursor-pointer size-10  shadow-lg bg-blue border-blue text-white  '>
        <FaPlus className='size-6'  />
      </div>
    </PopoverTrigger>
    <PopoverContent className="rounded-xl ">
      <h4 className='font-semibold mb-3'>{extra.name}</h4>
      <div className='flex flex-col gap-3 py-3 border-t border-b'>
        {rooms.map((room, index) => (
          <div key={room.id} className='flex items-center gap-2 font-semibold cursor-pointer'>
            <Checkbox 
              id={room.id}
              className='size-7' 
              checked={selectedRooms.includes(room.id)}
              onCheckedChange={() => handleSelectRoom(room.id)}
            /> 
            <Label htmlFor={room.id} className='cursor-pointer'>
              Room {index + 1}
            </Label>
          </div>
        ))}
      </div>
      <div className='flex justify-between items-center pt-3'>
        <Button 
          onClick={() => handleCancel()} 
          variant="outline" 
          className='h-[45px] w-30'
          disabled={isDone}
        >
          Cancel
        </Button>
        <Button 
          onClick={() => handleAddExtra(selectedRooms)} 
          className={`h-[45px] w-30 flex items-center justify-center gap-2 `}
          disabled={isDone}
        >
          {isDone ? (
            <>
              <FaCheck className='size-4' />
              Done
            </>
          ) : (
            'Add'
          )}
        </Button>
      </div>
    </PopoverContent>
    </Popover>
  )
}

export default AddExtraButton