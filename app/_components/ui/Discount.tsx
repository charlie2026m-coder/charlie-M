'use client';

import { useState, useEffect } from 'react';
import { RiCloseLargeLine } from "react-icons/ri";

const Discount = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if discount banner was closed in this session
    const isClosed = sessionStorage.getItem('discountBannerClosed');
    if (!isClosed) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    // Save to sessionStorage and hide banner
    sessionStorage.setItem('discountBannerClosed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className='w-full flex items-center bg-mute text-white'>
      <div className='container flex items-center justify-between p-2.5'>
        <div />
        <span>Get the best rate direct with us</span>
        <RiCloseLargeLine 
          className='size-6 cursor-pointer hover:opacity-70 transition-opacity' 
          onClick={handleClose}
        />
      </div>
    </div>
  );
}

export default Discount