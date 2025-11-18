import { useState } from 'react'
import PaymentCard from './PaymentCard'
import { RadioGroup, RadioGroupItem } from '@/app/_components/ui/radio-group'
import { Label } from '@/app/_components/ui/label'

type paymentOptions = 'card' | 'apple' | 'google' | 'klarna' | 'paypal'
const PaymentForm = () => {
  const [selectedPayment, setSelectedPayment] = useState<paymentOptions>('card')

  const options = [
    {
      label: 'Credit Card',
      value: 'card',
      component: <></>
    },
    {
      label: 'Apple Pay',
      value: 'apple',
      component: <></>
    },
    {
      label: 'Google Pay',
      value: 'google',
      component: <></>
    },
    {
      label: 'Klarna',
      value: 'klarna',
      component: <></>
    },
    {
      label: 'PayPal',
      value: 'paypal',
      component: <></>
    },
  ]
  return (
    <div className='flex flex-col gap-4 col-span-2'>
      <h2 className='text-[22px] font-bold mb-10'>Payment</h2>

      <RadioGroup value={selectedPayment} onValueChange={(value) => setSelectedPayment(value as paymentOptions)} className="flex ">
        <div className='flex flex-col gap-4 w-full'> 
          {options.map((option) => (  
            <PaymentCard isChecked={selectedPayment === option.value} key={option.value}>
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="text-[17px] inter font-[400] cursor-pointer">{option.label}</Label>
            </PaymentCard>
          ))} 
        </div>
      </RadioGroup>
      
      
        
    </div>
  )
}

export default PaymentForm