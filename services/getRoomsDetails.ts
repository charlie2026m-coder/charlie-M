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
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('id', { ascending: true })
  
  if (error) {
    console.error('Error fetching rooms:', error)
    throw error
  }
  
  return data || []
}
