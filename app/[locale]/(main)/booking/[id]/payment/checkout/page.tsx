'use client';

import { useEffect, useRef } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import PaymentForm from '../components/PaymentForm';
import { trackBeginCheckout, whenGtagReady } from '@/lib/analytics';

// Handles both normal payment flow and return from 3DS bank redirect
// When returning from 3DS, Adyen appends ?redirectResult=... to the URL
export default function CheckoutPage() {
  const amount = useBookingStore(state => state.booking?.totalAmount ?? 0);
  const roomName = useBookingStore(state => state.roomDetails?.name ?? '');
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || !amount) return;
    return whenGtagReady(() => {
      if (tracked.current) return;
      tracked.current = true;
      trackBeginCheckout({ value: amount, roomName });
    });
  }, [amount, roomName]);

  return <PaymentForm amount={amount} />;
}
