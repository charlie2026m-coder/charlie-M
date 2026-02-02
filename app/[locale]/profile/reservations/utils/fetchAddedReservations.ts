import { supabase } from '@/lib/supabase'

export async function fetchAddedReservations() {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const { data: reservationIds } = await supabase
    .from('reservations')
    .select('reservation_id')
    .eq('user_id', user.id)

  if (!reservationIds || reservationIds.length === 0) return []

  const promises = reservationIds.map(({ reservation_id }) => {
    return fetch(`/api/reservations/${reservation_id}`)
      .then(r => r.ok ? r.json() : null)
      .catch(err => {
        console.error(`❌ ${reservation_id}: ${err.message}`)
        return null
      })
  })

  const results = await Promise.all(promises)
  return results.filter(r => r !== null)
}
