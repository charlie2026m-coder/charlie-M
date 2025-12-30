'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RoomDetails } from '@/services/getRoomsDetails'
import { Button } from '@/app/_components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table'
import { IoLogOut, IoSearch } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'

export default function AdminRoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomDetails[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/admin/login')
      return
    }

    // Проверка роли админа
    const { data: adminData } = await supabase
      .from('admins')
      .select('role')
      .eq('email', user.email!)
      .single()

    if (!adminData) {
      router.push('/admin/login')
      return
    }

    // Загрузка комнат
    loadRooms()
    setIsLoading(false)
  }

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('id', { ascending: true })

    if (data) {
      setRooms(data)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const filteredRooms = rooms.filter(room => 
    room.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.group_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-600">Loading...</div>
      </div>
    )
  }

  // Admin Panel
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm font-bold">
              A
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">Rooms</h1>
              <p className="text-xs text-gray-500">{rooms.length} total</p>
            </div>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="gap-1.5 border-black text-black hover:bg-black hover:text-white h-8"
          >
            <IoLogOut className="size-3.5" />
            Logout
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="relative max-w-sm">
          <IoSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID or name..."
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors text-black placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="max-w-[1200px] mx-auto px-4 pb-8">
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-bold text-black w-[80px] text-center">Edit</TableHead>
                <TableHead className="font-bold text-black">Name</TableHead>
                <TableHead className="font-bold text-black w-[120px]">ID</TableHead>
                <TableHead className="font-bold text-black w-[100px] text-center">Guests</TableHead>
                <TableHead className="font-bold text-black w-[90px] text-center">Size</TableHead>
                <TableHead className="font-bold text-black w-[90px] text-center">Photos</TableHead>
                <TableHead className="font-bold text-black">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.length === 0 ? (
                <TableRow className="hover:bg-white">
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-gray-500 text-sm">No rooms found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room.id} className="cursor-pointer">
                    <TableCell className="text-center c">
                      <a href={`/admin/rooms/${room.id}`} >
                        <button className="inline-flex items-center cursor-pointer justify-center w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 transition-colors">
                          <MdEdit className="size-4" />
                        </button>
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 font-medium max-w-[350px]">
                      <div className="truncate">{room.group_name}</div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-black text-xs">
                      {room.id}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-black font-bold text-sm">
                        {room.max_persons}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2 h-8 rounded-full bg-gray-100 text-black font-bold text-sm">
                        {room.size}m²
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-black font-bold text-sm">
                        {room.photos.length}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {room.attributes.slice(0, 3).map((attr, i) => (
                          <span
                            key={i}
                            className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                          >
                            {attr}
                          </span>
                        ))}
                        {room.attributes.length > 3 && (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            +{room.attributes.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Help Footer */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <p className="text-xs text-gray-500 text-center">
            💡 Click the edit button to modify room details
          </p>
        </div>
      </div>
    </div>
  )
}

