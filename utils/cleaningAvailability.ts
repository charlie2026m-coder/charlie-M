import dayjs from 'dayjs'

export interface CleaningDateItem {
  serviceDate: string
  count: number
  isExisting: boolean
  amount?: {
    amount: number
    currency: string
  }
}


export const generateCleaningDates = (
  arrival: string,
  departure: string
): string[] => {
  const allDates: string[] = []
  let currentDate = dayjs(arrival).add(1, 'day')
  const endDate = dayjs(departure)

  while (currentDate.isBefore(endDate, 'day')) {
    allDates.push(currentDate.format('YYYY-MM-DD'))
    currentDate = currentDate.add(1, 'day')
  }

  return allDates
}


export const filterDatesByDaysOfWeek = (
  dates: string[],
  daysOfWeek?: (string | number)[]
): string[] => {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return dates
  }

  return dates.filter(date => {
    const dayName = dayjs(date).format('dddd') // e.g., "Monday", "Tuesday"
    const dayNumber = dayjs(date).day() // 0-6 (Sunday = 0)
    
    // Check if the date matches any of the allowed days
    return daysOfWeek.some(allowedDay => {
      if (typeof allowedDay === 'string') {
        // Compare as string (e.g., "Monday")
        return allowedDay === dayName
      } else {
        // Compare as number (0-6)
        return allowedDay === dayNumber
      }
    })
  })
}

/**
 * Checks if all available cleaning dates are already booked
 */
export const areAllCleaningDatesBooked = (
  availableDates: string[],
  existingDates?: any[]
): boolean => {
  if (!existingDates || existingDates.length === 0) {
    return false
  }

  const existingDatesWithCount = existingDates.filter((d: any) => (d.count || 0) > 0)
  const existingDateStrings = existingDatesWithCount.map((d: any) => d.serviceDate)
  
  // Check if all available dates are in existing dates
  return availableDates.every(date => existingDateStrings.includes(date))
}

/**
 * Creates a complete array of cleaning dates with isExisting flag
 * This combines all possible dates with existing bookings
 */
export const createCleaningDatesArray = (
  arrival: string,
  departure: string,
  daysOfWeek?: (string | number)[],
  existingDates?: any[],
  price?: number,
  currency?: string
): CleaningDateItem[] => {
  // Generate all dates between arrival and departure (excluding first and last day)
  const allDates = generateCleaningDates(arrival, departure)
  
  // If no dates generated (e.g., arrival and departure are the same or adjacent), return empty array
  if (allDates.length === 0) {
    return []
  }

  // Filter by daysOfWeek if available, otherwise use all dates
  const availableDates = (daysOfWeek && daysOfWeek.length > 0) 
    ? filterDatesByDaysOfWeek(allDates, daysOfWeek)
    : allDates

  // Create a map of existing dates for quick lookup
  const existingDatesMap = new Map<string, any>()
  if (existingDates && existingDates.length > 0) {
    existingDates.forEach(item => {
      const formattedDate = dayjs(item.serviceDate).format('YYYY-MM-DD')
      existingDatesMap.set(formattedDate, item)
    })
  }

  // Create the complete array with isExisting flag
  const result: CleaningDateItem[] = availableDates.map(date => {
    const existing = existingDatesMap.get(date)
    
    if (existing && (existing.count || 0) > 0) {
      // This date already exists in the reservation
      return {
        serviceDate: date,
        count: existing.count || 0,
        isExisting: true,
        amount: existing.amount || {
          amount: (price || 0) * (existing.count || 0),
          currency: currency || 'EUR'
        }
      }
    } else {
      // This date is available for booking
      return {
        serviceDate: date,
        count: 0,
        isExisting: false,
        amount: {
          amount: 0,
          currency: currency || 'EUR'
        }
      }
    }
  })

  return result
}

export const shouldShowCleaningService = (
  arrival: string,
  departure: string,
  daysOfWeek?: (string | number)[],
  existingDates?: any[]
): boolean => {
  // Create the complete dates array
  const datesArray = createCleaningDatesArray(arrival, departure, daysOfWeek, existingDates)

  // If no dates at all, hide the card
  if (datesArray.length === 0) {
    return false
  }

  // Show the card only if there are dates with count = 0 (available for booking)
  const hasAvailableDates = datesArray.some(date => date.count === 0)
  
  return hasAvailableDates
}
