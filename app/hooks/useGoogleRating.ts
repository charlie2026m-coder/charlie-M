'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * The property's Google rating, for the little "★ 4.6 · 203" badge on room
 * cards. Backed by /api/reviews (Google Places, 24h server cache).
 *
 * One shared query key, so however many cards are on screen the browser makes
 * exactly ONE request and every badge reads the same cache entry.
 */

interface GoogleRating {
  rating: number | null
  userRatingCount: number | null
}

async function fetchGoogleRating(): Promise<GoogleRating> {
  const res = await fetch('/api/reviews')
  if (!res.ok) throw new Error(`reviews ${res.status}`)
  const data = await res.json()
  return {
    rating: typeof data?.rating === 'number' ? data.rating : null,
    userRatingCount: typeof data?.userRatingCount === 'number' ? data.userRatingCount : null,
  }
}

export function useGoogleRating() {
  const { data } = useQuery({
    queryKey: ['google-rating'],
    queryFn: fetchGoogleRating,
    // The upstream route caches for 24h; no point re-asking within a session.
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
  return data ?? { rating: null, userRatingCount: null }
}
