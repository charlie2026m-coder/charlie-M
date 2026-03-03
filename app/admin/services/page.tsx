'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ServiceDetails } from '@/services/getServicesDetails'
import { Button } from '@/app/_components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table'
import { IoLogOut, IoSearch } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'

export default function AdminServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceDetails[]>([])
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
    const { data: adminData } = await supabase
      .from('admins')
      .select('role')
      .eq('email', user.email!)
      .single()
    if (!adminData) {
      router.push('/admin/login')
      return
    }
    loadServices()
    setIsLoading(false)
  }

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('id', { ascending: true })
    if (data) setServices(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const filtered = services.filter(
    (s) =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title_de.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm font-bold">
              A
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">Services</h1>
              <p className="text-xs text-gray-500">{services.length} total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/rooms">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-black text-black hover:bg-black hover:text-white h-8"
              >
                Rooms
              </Button>
            </Link>
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
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="relative max-w-sm">
          <IoSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID or title..."
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors text-black placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pb-8">
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-bold text-black w-[80px] text-center">Edit</TableHead>
                <TableHead className="font-bold text-black">Title (EN)</TableHead>
                <TableHead className="font-bold text-black w-[120px]">ID</TableHead>
                <TableHead className="font-bold text-black w-[90px] text-center">Image</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-white">
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-gray-500 text-sm">No services found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((service) => (
                  <TableRow key={service.id} className="cursor-pointer">
                    <TableCell className="text-center">
                      <Link href={`/admin/services/${service.id}`}>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
                        >
                          <MdEdit className="size-4" />
                        </button>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 font-medium max-w-[350px]">
                      <div className="truncate">{service.title_en}</div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-black text-xs">
                      {service.id}
                    </TableCell>
                    <TableCell className="text-center">
                      {service.image_path ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xs">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <p className="text-xs text-gray-500 text-center">
            💡 Click the edit button to change titles, descriptions and image
          </p>
        </div>
      </div>
    </div>
  )
}
