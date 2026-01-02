-- ============================================
-- PROFILES TABLE WITH TRIGGERS
-- Creates user profiles table and auto-sync with auth.users
-- ============================================

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  last_name TEXT,
  email TEXT,
  mobile TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: users can view only their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- Policy: users can update only their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Policy: allows profile creation by user or system/trigger
CREATE POLICY "Allow profile creation"
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

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

-- Trigger for user updates
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

