export interface Room {
  id: string
  group_name: string
  attributes: string[]
  max_persons: number
  size: number
  photos: string[]
  created_at: string
  updated_at: string
}

export type RoomInsert = Omit<Room, 'created_at' | 'updated_at'>
export type RoomUpdate = Partial<RoomInsert>

