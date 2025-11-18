import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/supabase-server'

export default async function Profile() {
  // Check authentication
  const { authenticated, user } = await requireAuth()

  // If not authenticated, redirect (in case middleware didn't trigger)
  if (!authenticated || !user) {
    redirect('/?auth=signin')
  }

  return (
    <div className="container px-[100px] py-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <label className="text-sm text-gray-600">Email</label>
          <p className="text-lg font-medium">{user.email}</p>
        </div>
        
        <div className="mb-4">
          <label className="text-sm text-gray-600">User ID</label>
          <p className="text-sm font-mono bg-gray-100 p-2 rounded">{user.id}</p>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-600">Created At</label>
          <p className="text-sm">{new Date(user.created_at).toLocaleString()}</p>
        </div>

        {user.user_metadata?.full_name && (
          <div className="mb-4">
            <label className="text-sm text-gray-600">Full Name</label>
            <p className="text-lg">{user.user_metadata.full_name}</p>
          </div>
        )}
      </div>
    </div>
  )
}