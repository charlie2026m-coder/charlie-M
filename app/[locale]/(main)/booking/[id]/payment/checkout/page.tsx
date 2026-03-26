'use client';

import { useBookingStore } from '@/store/useBookingStore';
import PaymentForm from '../components/PaymentForm';

// Handles both normal payment flow and return from 3DS bank redirect
// When returning from 3DS, Adyen appends ?redirectResult=... to the URL
export default function CheckoutPage() {
  const amount = useBookingStore(state => state.booking?.totalAmount ?? 0);
  return <PaymentForm amount={amount} />;
}
