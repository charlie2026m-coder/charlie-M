import { Button } from "@/app/_components/ui/button"

const UpgradeRoom = () => {

  const items = [
    {
      category: 'Luxury',
      price: 120,
    },
    {
      category: 'Standard',
      price: 40,
    },
    {
      category: 'Economy',
      price: 70,
    },
  ]
  return (
    <>
      <div className='flex items-center gap-2 border-b pb-2 mb-5 text-lg font-semibold w-full'>
        Upgrade your Room:
      </div>
      <div className='grid grid-cols-3 gap-5'> 
        {items.map((item) => (
          <div key={item.category} className='flex flex-col bg-white rounded-2xl py-4 px-5 gap-2.5'>
            <div className='font-bold'>{item.category}</div>
            <div className='inter text-[15px] font-regular text-dark'>for <span className='font-bold text-green'>{item.price}€</span> per night more you can stay in {item.category}.</div>
            <Button variant='outline' className='w-full border-brown text-brown text-sm h-[35px]' >Upgrade</Button>
          </div>
        ))}
      </div>
    </>
  )
}

export default UpgradeRoom