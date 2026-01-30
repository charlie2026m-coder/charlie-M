import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'

interface ExtensionRoomsParams {
  from: Date
  to: Date
  roomId: string
}

export const useExtensionRooms = () => {
  return useMutation({
    mutationFn: async ({ from, to, roomId }: ExtensionRoomsParams) => {
      const fromStr = dayjs(from).format('YYYY-MM-DD')
      const toStr = dayjs(to).format('YYYY-MM-DD')

      const response = await fetch(`/api/rooms/extension?from=${fromStr}&to=${toStr}&roomId=${roomId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch extension rooms')
      }

      const data = await response.json()
      const availableUnits = data.availableUnits || 0
      console.log('Available rooms:', availableUnits)
      return availableUnits
    },
  })
}
