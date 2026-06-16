import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface SelfCheckoutToken {
  token: string
  unit_id: string
  unit_name: string
  created_at: string
  url: string
}

export interface SelfCheckoutLogEntry {
  at: string
  token: string
  reservation_id: string | null
  unit_id: string | null
  guest: string | null
  result: string
}

export function useSelfCheckoutList() {
  return useQuery({
    queryKey: ['self-checkout', 'list'],
    queryFn: async (): Promise<SelfCheckoutToken[]> => {
      const res = await fetch('/api/admin/self-checkout/list')
      if (!res.ok) throw new Error('Failed to load QR codes')
      const json = await res.json()
      return json.items || []
    },
  })
}

export function useSelfCheckoutLog() {
  return useQuery({
    queryKey: ['self-checkout', 'log'],
    queryFn: async (): Promise<SelfCheckoutLogEntry[]> => {
      const res = await fetch('/api/admin/self-checkout/log?limit=200')
      if (!res.ok) throw new Error('Failed to load checkout log')
      const json = await res.json()
      return json.items || []
    },
    refetchInterval: 15000,
  })
}

export function useGenerateTokens() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean; units: number; created: number }> => {
      const res = await fetch('/api/admin/self-checkout/generate', { method: 'POST' })
      if (!res.ok) throw new Error('Token generation failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-checkout', 'list'] })
    },
  })
}
