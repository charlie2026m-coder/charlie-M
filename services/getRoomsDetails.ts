import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface RoomDetails {
  id: string;
  group_name: string;
  attributes: string[];
  max_persons: number;
  size: number;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export async function getRoomsDetails(): Promise<RoomDetails[]> {
  try {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('id', { ascending: true })
  
  if (error) {
      console.error('Error fetching rooms from Supabase:', error)
      // Return empty array as fallback instead of throwing
      // This allows the main flow to continue with Apaleo data
      return []
  }
  
  return data || []
  } catch (error) {
    console.error('Unexpected error in getRoomsDetails:', error)
    // Return empty array as fallback
    return []
  }
}
