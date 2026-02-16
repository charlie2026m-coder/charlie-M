import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'

interface ExtensionRoomsParams {
  from: Date
  to: Date
  roomId: string
  isBaby?: boolean
}

interface ExtensionRoomsResponse {
  availableUnits: number
  babyBedAvailable?: boolean
  message?: string
}

export const useExtensionRooms = () => {
  return useMutation({
    mutationFn: async ({ from, to, roomId, isBaby }: ExtensionRoomsParams): Promise<ExtensionRoomsResponse> => {
      const fromStr = dayjs(from).format('YYYY-MM-DD')
      const toStr = dayjs(to).format('YYYY-MM-DD')
      const isBabyParam = isBaby ? '&isBaby=true' : ''

      const response = await fetch(`/api/rooms/extension?from=${fromStr}&to=${toStr}&roomId=${roomId}${isBabyParam}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch extension rooms')
      }

      const data: ExtensionRoomsResponse = await response.json()
      console.log('Extension check result:', data)
      return data
    },
  })
}
