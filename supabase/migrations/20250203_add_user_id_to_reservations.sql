ALTER TABLE public.reservations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_reservations_user_id ON public.reservations(user_id);

UPDATE public.reservations SET user_id = id WHERE user_id IS NULL;
