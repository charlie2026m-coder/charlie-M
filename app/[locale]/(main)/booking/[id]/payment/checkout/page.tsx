'use client';

import { useBookingStore } from '@/store/useBookingStore';
import PaymentForm from '../components/PaymentForm';
import PaymentBanner from '@/app/_components/ui/PaymentBanner';
import SummaryCard from '../../components/SummaryCard';
import Steps from '../../components/Steps';

// Handles both normal payment flow and return from 3DS bank redirect
// When returning from 3DS, Adyen appends ?redirectResult=... to the URL
export default function CheckoutPage() {
  const amount = useBookingStore(state => state.booking?.totalAmount ?? 0);

  return (
    <>
      <Steps currentStep={2} />
      <PaymentBanner />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px] pt-16">
        <PaymentForm amount={amount} />
        <SummaryCard />
      </div>
    </>
  );
}
