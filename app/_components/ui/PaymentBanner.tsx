import React from 'react'

const PaymentBanner = () => {
  return (
    <div className='fixed flex-col top-0 left-0 right-0 z-50 bg-red-500 text-white p-4 text-center h-50 flex items-center justify-center'>
      <p className='text-xl font-bold'>
        TEST PAYMENT ENVIRONMENT - DO NOT USE REAL PAYMENT CARD DETAILS
      </p>
      <div className='flex imtes-center gap-6 mt-4'>
        <span>4111 1111 1111 1111</span>
        <span>3/30</span>
        <span>737</span>
      </div>
    </div>
  )
}

export default PaymentBanner