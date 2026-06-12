import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockGetSession, mockSignInAnonymously, mockPush, mockSetGuestData } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignInAnonymously: vi.fn(),
  mockPush: vi.fn(),
  mockSetGuestData: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/store/useProfile', () => ({ useProfileStore: () => ({ setGuestData: mockSetGuestData }) }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: mockGetSession, signInAnonymously: mockSignInAnonymously } },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import ReservationForm from '@/app/_components/Auth/ReservationForm';

function mockFetchResponse(status: number, data: object) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

// The form now requires a reservation id AND a last name (second factor).
async function fillForm(reservationId: string, lastName = 'Smith') {
  const [idInput, lastNameInput] = screen.getAllByRole('textbox');
  await userEvent.type(idInput, reservationId);
  await userEvent.type(lastNameInput, lastName);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
  mockSignInAnonymously.mockResolvedValue({ error: null });
});

describe('ReservationForm (CharlieM)', () => {
  it('renders both inputs and the button', () => {
    render(<ReservationForm />);
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('button disabled when empty', () => {
    render(<ReservationForm />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('button disabled when only reservation id is filled', async () => {
    render(<ReservationForm />);
    const [idInput] = screen.getAllByRole('textbox');
    await userEvent.type(idInput, 'RCMH-TEST');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('button enabled when both fields have text', async () => {
    render(<ReservationForm />);
    await fillForm('RCMH-TEST');
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows error on 404', async () => {
    mockFetchResponse(404, { error: 'Not found' });
    render(<ReservationForm />);
    await fillForm('RCMH-MISSING');
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('checkBookingId')).toBeInTheDocument());
  });

  it('saves to store on success', async () => {
    const data = { id: 'gw-cmh-1' };
    mockFetchResponse(200, data);
    render(<ReservationForm />);
    await fillForm('RCMH-OK');
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockSetGuestData).toHaveBeenCalledWith(data));
  });

  it('creates anonymous session when no existing session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFetchResponse(200, { id: 'gw-1' });
    render(<ReservationForm />);
    await fillForm('RCMH-ANON');
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockSignInAnonymously).toHaveBeenCalled());
  });

  it('redirects to /profile/reservations on success', async () => {
    mockFetchResponse(200, { id: 'gw-1' });
    render(<ReservationForm />);
    await fillForm('RCMH-REDIR');
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile/reservations'));
  });
});
