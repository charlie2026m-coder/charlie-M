import React from 'react'
import CustomTooltip from '@/app/_components/ui/CustomTooltip'

const PriceSection = () => {
  return (
    <div className='flex flex-col border rounded-2xl p-5 bg-white'>
      <div className='font-semibold mb-3 border-b'>Rooms:</div>
      {
        roomItems.map((item) => (
          <RoomItem key={item.name} name={item.name} price={item.price} quantity={item.nights} />
        ))
      }
      <div className='font-semibold my-3 border-b'>Extras:</div>
      {
        extraItems.map((item) => (
          <RoomItem key={item.name} name={item.name} price={item.price} quantity={item.quantity} />
        ))
      }
      <div className='font-semibold text-lg mt-5 flex items-center justify-between items-center'>
        <div className='flex items-center'>Total: <span className='font-normal text-sm text-dark mx-2'>( Taxes and charges included ) </span> <CustomTooltip text='Total price for the room' color='text-brown' /></div>
        <div className='font-bold text-green-600'>€ 1756.00</div>
      </div>
    </div>
  )
}

export default PriceSection

const RoomItem = ({name, price, quantity}: {name: string, price: number, quantity: number}) =>{
  return (
    <div className='grid grid-cols-3 text-sm mb-1 pl-5 group cursor-pointer hover:font-semibold'>
      <div className='col-span-1 '>
        {name}
      </div>
      <div className='col-span-1 text-dark text-right group-hover:font-semibold'>
        € {price} x {quantity}
      </div>
      <div className='col-span-1 font-semibold text-right group-hover:text-black'>
        € {price * quantity}
      </div>
    </div>
  )
}

const roomItems = [
  {
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 1,
  },
  {
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 4,
  },
  { 
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 3,
  },
  {
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 2,
  },
]
const extraItems = [
  {
    name: 'Breakfast',
    price: 10.00,
    quantity: 15,
  },
  {
    name: 'Cleaning',
    price: 15.00,
    quantity: 1,
  },
  {
    name: 'Airport transfer',
    price: 50.00,
    quantity: 1,
  },
]