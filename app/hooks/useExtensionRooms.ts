import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'

interface ExtensionRoomsParams {
  from: Date
  to: Date
  roomId: string
  isBaby?: boolean
}

export const useExtensionRooms = () => {
  return useMutation({
    mutationFn: async ({ from, to, roomId, isBaby }: ExtensionRoomsParams) => {
      const fromStr = dayjs(from).format('YYYY-MM-DD')
      const toStr = dayjs(to).format('YYYY-MM-DD')
      const isBabyParam = isBaby ? '&isBaby=true' : ''

      const response = await fetch(`/api/rooms/extension?from=${fromStr}&to=${toStr}&roomId=${roomId}${isBabyParam}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch extension rooms')
      }

      const data = await response.json()
      console.log('Extension check result:', data)
      return data
    },
  })
}
