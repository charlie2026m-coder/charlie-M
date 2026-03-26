'use client'
import { Button } from "@/app/_components/ui/button";
import Image from 'next/image';
import { TbBrandWhatsappFilled } from "react-icons/tb";
import { IoMail } from "react-icons/io5";
import { useState, useCallback, useEffect } from 'react';

const upgradeItems =[
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
  {
    category: 'Rich',
    price: 120,
  },
  {
    category: 'Deluxe',
    price: 40,
  },
  {
    category: 'Economy',
    price: 70,
  },
]

const UpgradeSection = () => {
  const [currentSet, setCurrentSet] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [itemsPerSet, setItemsPerSet] = useState(3);

  // Adjust items per set based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newCount = width < 1024 ? 1 : 3; // Mobile: 1, Desktop: 3
      setItemsPerSet(newCount);
      setCurrentSet(0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalSets = Math.ceil(upgradeItems.length / itemsPerSet);
  const currentItems = upgradeItems.slice(
    currentSet * itemsPerSet,
    (currentSet + 1) * itemsPerSet
  );

  const handleSetChange = useCallback((newSet: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSet(newSet);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  }, []);

  return (
    <div className='flex flex-col pb-6'>
      <div className='px-3 lg:px-[30px] pb-6'>
        <h3 className='font-semibold py-2.5 border-b mb-5'>Upgrade your Room:</h3>
        
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-5 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {currentItems.map((item) => (
            <div key={item.category} className='flex flex-col bg-white border border-light1 rounded-2xl py-4 px-5 gap-2.5'>
              <div className='font-bold'>{item.category}</div>
              <div className='inter text-[15px] font-regular text-dark'>for <span className='font-bold text-green'>{item.price}€</span> per night more you can stay in {item.category}.</div>
              <Button variant='outline' className='w-full border-brown text-brown text-sm h-[35px]'>Upgrade</Button>
            </div>
          ))}
        </div>

        {/* Pagination dots - show only if more than itemsPerSet */}
        {totalSets > 1 && (
          <div className='flex justify-center gap-2 mt-6'>
            {Array.from({ length: totalSets }).map((_, index) => (
              <button
                key={index}
                onClick={() => handleSetChange(index)}
                className={`size-4 rounded-full transition-all duration-300 ${
                  index === currentSet 
                    ? 'bg-brown w-8' 
                    : 'bg-blue hover:bg-blue/80'
                }`}
                aria-label={`Go to set ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className='bg-light2  flex flex-col lg:flex-row justify-between'>

        <div className='flex w-full px-2 lg:px-4 lg:w-3/5 xl:w-1/2  pt-3 items-center gap-6 '>
          <Image src='/images/help-man.svg' alt='upgrade room' width={90} height={175} className='w-[90px] h-full object-cover' />
          <div className=' text-mute'>
            <h3 className='font-semibold mb-3'>Need anything? We're right here.</h3>
            <p className='text-sm'>Our team is here 24/7 to make your stay smooth, simple, and stress-free. <br /> Reach out anytime — we’re just one click away.</p>
          </div>
        </div>

        <div className='flex flex-col gap-3 w-full lg:w-2/5 text-sm justify-center px-2 lg:px-8 py-5'>
          <a 
            href='https://wa.me/49XXXXXXXXX' 
            target='_blank' 
            rel='noopener noreferrer'
            className='flex flex-col px-5 py-2 border border-black rounded-3xl w-full cursor-pointer hover:bg-blue hover:border-blue hover:text-white'
          >
            <div className='flex items-center gap-2'>
              <TbBrandWhatsappFilled className='size-6' />
              <span>WhatsApp Us</span>
            </div>
            <span className='font-semibold'>+49 XXX XXXX XXX</span>
          </a>
          <a 
            href='mailto:hello@charliem.stay'
            className='flex flex-col px-5 py-2 border border-black rounded-3xl w-full cursor-pointer hover:bg-blue hover:border-blue hover:text-white'
          >
            <div className='flex items-center gap-2'>
              <IoMail className='size-6' />
              <span>Email Us</span>
            </div>
            <span className='font-semibold'>hello@charliem.stay</span>
          </a>

        </div>
      </div>
    </div>
  )
}

export default UpgradeSection;

