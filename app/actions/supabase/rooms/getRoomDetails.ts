import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

export interface RoomDetails {
  id: string;
  title_en: string;
  title_de: string;
  description_en: string | null;
  description_de: string | null;
  attributes: string[];
  max_persons: number;
  size: number;
  photos: string[];
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const fetchAllRooms = async (): Promise<RoomDetails[]> => {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching rooms from Supabase:', error);
    return [];
  }
  return data || [];
};

const fetchRoomById = async (id: string): Promise<RoomDetails | null> => {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching room ${id} from Supabase:`, error);
    return null;
  }
  return data;
};

// Cached — invalidated via revalidateTag('rooms') when admin updates room data
export const getRoomDetails = unstable_cache(fetchAllRooms, ['supabase-rooms'], { tags: ['rooms'] });

export const getRoomById = unstable_cache(
  fetchRoomById,
  ['supabase-room'],
  { tags: ['rooms'] },
);
