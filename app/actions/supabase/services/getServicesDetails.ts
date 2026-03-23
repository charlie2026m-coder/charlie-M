import { createClient } from '@supabase/supabase-js';

export interface ServiceDetails {
  id: string;
  title_en: string;
  title_de: string;
  description_en: string | null;
  description_de: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export async function getServicesDetails(): Promise<ServiceDetails[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching services from Supabase:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error in getServicesDetails:', error);
    return [];
  }
}
