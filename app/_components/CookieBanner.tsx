'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from './ui/button'
import { FaCookieBite } from 'react-icons/fa'

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem('cookieConsent')
    if (!hasAccepted) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl'>
      <div className='container mx-auto px-4 md:px-10 py-6 md:py-8'>
        <div className='flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6'>
          {/* Icon */}
          <div className='hidden md:flex shrink-0'>
            <div className='size-12 bg-blue/10 rounded-full flex items-center justify-center'>
              <FaCookieBite className='size-6 text-blue' />
            </div>
          </div>

          {/* Content */}
          <div className='flex-1'>
            <h3 className='text-lg font-bold text-black mb-2 flex items-center gap-2'>
              <FaCookieBite className='size-5 text-blue md:hidden' />
              We use cookies
            </h3>
            <p className='text-sm text-dark leading-relaxed'>
              We use strictly necessary cookies to enable user authentication, manage user accounts, and support booking and check-in functionality. Personal data (name, last name, phone number, and email) is stored and processed solely to provide these services.
            </p>
            <Link 
              href='/privacy-policy'
              className='text-sm text-blue underline hover:text-blue/80 font-medium mt-2 inline-block'
            >
              Privacy Policy
            </Link>
          </div>

          {/* Button */}
          <div className='shrink-0 w-full md:w-auto'>
            <Button
              onClick={handleAccept}
              className='w-full md:w-[120px] h-12 bg-blue hover:bg-blue/90 text-white font-semibold rounded-full'
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CookieBanner

