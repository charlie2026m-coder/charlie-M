-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_updated();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Function to automatically create profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  first_name TEXT;
  last_name_val TEXT;
BEGIN
  -- Check if last_name exists in metadata
  IF NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
    first_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
    last_name_val := NEW.raw_user_meta_data->>'last_name';
  ELSE
    -- Split full name by space (for Google OAuth)
    full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '');
    
    IF full_name != '' AND position(' ' in full_name) > 0 THEN
      first_name := split_part(full_name, ' ', 1);
      last_name_val := substring(full_name from position(' ' in full_name) + 1);
    ELSE
      first_name := full_name;
      last_name_val := '';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, name, last_name, email, mobile)
  VALUES (
    NEW.id,
    first_name,
    last_name_val,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to sync auth.users data to profiles on user update
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  first_name TEXT;
  last_name_val TEXT;
BEGIN
  -- Check if last_name exists in metadata
  IF NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
    first_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
    last_name_val := NEW.raw_user_meta_data->>'last_name';
  ELSE
    -- Split full name by space (for Google OAuth)
    full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '');
    
    IF full_name != '' AND position(' ' in full_name) > 0 THEN
      first_name := split_part(full_name, ' ', 1);
      last_name_val := substring(full_name from position(' ' in full_name) + 1);
    ELSE
      first_name := full_name;
      last_name_val := '';
    END IF;
  END IF;

  UPDATE public.profiles
  SET 
    name = COALESCE(first_name, name),
    last_name = COALESCE(last_name_val, last_name),
    email = NEW.email,
    mobile = COALESCE(NEW.raw_user_meta_data->>'phone', mobile)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user updates (sync email, name, phone from auth.users to profiles)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_updated();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on profile changes
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Sync existing profiles with auth.users data (one-time update for existing users)
UPDATE public.profiles p
SET 
  name = CASE 
    WHEN u.raw_user_meta_data->>'last_name' IS NOT NULL THEN 
      COALESCE(u.raw_user_meta_data->>'name', p.name)
    WHEN position(' ' in COALESCE(u.raw_user_meta_data->>'name', '')) > 0 THEN
      split_part(COALESCE(u.raw_user_meta_data->>'name', ''), ' ', 1)
    ELSE 
      COALESCE(u.raw_user_meta_data->>'name', p.name)
  END,
  last_name = CASE 
    WHEN u.raw_user_meta_data->>'last_name' IS NOT NULL THEN 
      u.raw_user_meta_data->>'last_name'
    WHEN position(' ' in COALESCE(u.raw_user_meta_data->>'name', '')) > 0 THEN
      substring(COALESCE(u.raw_user_meta_data->>'name', '') from position(' ' in COALESCE(u.raw_user_meta_data->>'name', '')) + 1)
    ELSE 
      p.last_name
  END,
  email = u.email,
  mobile = COALESCE(u.raw_user_meta_data->>'phone', p.mobile)
FROM auth.users u
WHERE p.id = u.id;

