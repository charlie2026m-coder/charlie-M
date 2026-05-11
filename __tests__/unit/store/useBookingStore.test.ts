import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from '@/store/useBookingStore';

const initialState = useBookingStore.getState();

beforeEach(() => {
  useBookingStore.setState(initialState, true);
});

describe('useBookingStore (CharlieM)', () => {
  it('initial state has correct defaults', () => {
    const state = useBookingStore.getState();
    expect(state.booking).toBeUndefined();
    expect(state.transactionReference).toBeNull();
    expect(state.isRefundable).toBe(false);
  });

  it('setBooking updates booking', () => {
    const booking = { id: 'B-CMH-1' } as any;
    useBookingStore.getState().setBooking(booking);
    expect(useBookingStore.getState().booking).toEqual(booking);
  });

  it('setTransactionReference updates value', () => {
    useBookingStore.getState().setTransactionReference('TX-CMH');
    expect(useBookingStore.getState().transactionReference).toBe('TX-CMH');
  });

  it('setIsRefundable toggles flag', () => {
    useBookingStore.getState().setIsRefundable(true);
    expect(useBookingStore.getState().isRefundable).toBe(true);
  });

  it('addRoom appends a room', () => {
    const before = useBookingStore.getState().rooms.length;
    useBookingStore.getState().addRoom();
    expect(useBookingStore.getState().rooms.length).toBe(before + 1);
  });

  it('removeRoom does NOT remove last room (guard)', () => {
    useBookingStore.setState({ ...useBookingStore.getState(), rooms: [{ id: 'r-only', adults: 1, children: 0, extras: [] }] as any });
    useBookingStore.getState().removeRoom('r-only');
    expect(useBookingStore.getState().rooms.length).toBe(1);
  });

  it('clearBooking resets state', () => {
    useBookingStore.getState().setTransactionReference('TX-CMH');
    useBookingStore.getState().clearBooking();
    expect(useBookingStore.getState().transactionReference).toBeNull();
  });

  it('persist key is charlie-booking-storage', () => {
    const storeApi = useBookingStore as any;
    const key = storeApi.persist?.getOptions?.()?.name;
    expect(key).toBe('charlie-booking-storage');
  });
});
