
type ITypeM = 'privacyPolicy' | 'termsAndConditions'
interface IContentPAndT {
  title: string,
  paragraphs: string[];
}
interface IMaterials {
  privacyPolicy:{
    title: string;
    description: string;
    lastUpdated: string;
    content: IContentPAndT[]
  },
  termsAndConditions:{
    title: string;
    description: string;
    lastUpdated: string;
    content: IContentPAndT[]
  },

}



export const infoCardsContent = [
  { 
    id: 1, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'], 
    description: ['A calm, well-lit workspace designed for focus and comfort.','Enjoy a quiet environment, fast WiFi, and a small coffee station that keeps you energized throughout the day.'], 
    card1: ['Comfortable chairs & a proper worktable', 'Fast WiFi', 'Coffee available anytime'], 
    card2: ['Located to the Elevator on the Ground Level', 'Easily accessible throughout the day (Open 24/7)'] 
  },
  { 
    id: 2, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'], 
    description: ['Secure, easy-to-use lockers for early arrivals and late departures — giving you complete freedom to explore without carrying your bags.'], 
    card1: ['Available before check-in and after check-out', 'Fully secure and simple to use'], 
    card2: ['Located on the –1 floor', 'Accessible via elevator or stairs', 'Opens with the same PIN code as your room'] 
  },
  { 
    id: 3, 
    images:  ['/images/room.jpg', '/images/room2.jpg', '/images/room3.jpg'], 
    description: ['Our Self-Service Closet offers fresh towels, toiletries, and essential items whenever you need them — available 24/7 and just a few steps from your room.'], 
    card1: ['Fresh towels', 'Toiletries', 'Room essentials'], 
    card2: ['Located on the –1 floor', 'Accessible via elevator or stairs', 'Opens with the same PIN code as your room'] 
  },
  { 
    id: 4, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'],
    description: ['Our laundry room is available whenever you need to wash or refresh your clothes, equipped with everything you need for a smooth experience.'], 
    card1: ['Modern washers & dryers (extra cost)', 'Iron & ironing board','Drying rack'], 
    card2: ['Located on the –1 floor', 'Accessible via elevator or stairs', 'Opens with the same PIN code as your room'] 
  },
  { 
    id: 5, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'], 
    description: ['Each room includes a coffee machine with complimentary capsules, so you can enjoy a calm moment in the morning or a quick boost before heading out.'], 
    card1: ['Coffee machine ( the brand of coffee machine (do not know yet)', 'Complimentary capsules (same here)'], 
  },
  { 
    id: 6, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'],
    description: ['High-speed WiFi is available throughout the hotel, offering a strong and reliable connection for streaming, video calls, or remote work.'], 
  },
  { 
    id: 7, 
    images:  ['/images/lost-image.webp'],
    description: ['If you lose something during your stay, please contact us, and we will do our best to help you find it.'], 
  },
  { 
    id: 8, 
    images:  ['/images/laundry-image.webp', '/images/coffee-image.webp', '/images/wifi-image.webp'],
    description: [
      'Your room is thoroughly cleaned before you arrive, so you can settle in comfortably from the first minute.',
      'During your stay, we don’t offer daily in-room cleaning or daily linen changes. For longer stays (7 nights or more), we’ll arrange a weekly refresh that includes a basic clean and fresh bed sheets/towels.',
      'We aim to reduce unnecessary water and chemical use while still keeping everything fresh for you.',
      'If you’d like an extra clean during your stay, you can easily book it in your user cabinet under Reservations. Additional services are available for a small fee.',
    ], 
  },
  { 
    id: 9, 
    images:  ['/images/garbage-image.webp'],
  },
]




export const amenities = [
  { 
    title: 'Kettle',  
    icon: '/images/amenities/kettle.webp',
    imageUrl: '/images/location-1.png',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' 
  },
  { 
    title: 'Coffee machine',  
    icon: '/images/amenities/coffee.webp',
    imageUrl: '/images/amenities/coffee.webp',
    description: 'Coffee machine' 
  },
  { 
    title: 'Fresh towels & bed linen',  
    icon: '/images/amenities/towels.webp',
    imageUrl: '/images/amenities/towels.webp',
    description: 'Fresh towels & bed linen' 
  },
  { 
    title: 'Mini Fridge',  
    icon: '/images/amenities/mini_fridge.webp',
    imageUrl: '/images/amenities/mini_fridge.webp',
    description: 'Mini Fridge' 
  },
  { 
    title: 'Hairdryer',  
    icon: '/images/amenities/hairdryer.webp',
    imageUrl: '/images/amenities/hairdryer.webp',
      description: 'Hairdryer' 
    },
    { 
    title: 'Smart TV',  
    icon: '/images/amenities/tv.webp',
    imageUrl: '/images/amenities/tv.webp',
    description: 'Smart TV' 
  },
  { 
    title: 'Hight-speed Wi-Fi',  
    icon: '/images/amenities/wifi.webp',
    imageUrl: '/images/amenities/wifi.webp',
    description: 'Hight-speed Wi-Fi' 
  },
  { 
    title: 'Air Conditioning',  
    icon: '/images/amenities/air.webp',
    imageUrl: '/images/amenities/air.webp',
    description: 'Air Conditioning' 
  },
  { 
    title: 'Blackout curtains',  
    icon: '/images/amenities/curtains.webp',
    imageUrl: '/images/amenities/curtains.webp',
    description: 'Blackout curtains' 
  },
  { 
    title: 'Self- Service Closet',  
    icon: '/images/amenities/closets.webp',
    imageUrl: '/images/amenities/closets.webp',
    description: 'Self- Service Closet' 
  },
  { 
    title: 'Elevator',  
    icon: '/images/amenities/elevator.webp',
    imageUrl: '/images/amenities/elevator.webp',
    description: 'Elevator' 
  },
  { 
    title: 'Weekly cleaning (for stays of 7+ nights)',  
    icon: '/images/amenities/cleaning.webp',
    imageUrl: '/images/amenities/cleaning.webp',
    description: 'Weekly cleaning (for stays of 7+ nights)' 
  },
  { 
    title: 'Luggage Storage',  
    icon: '/images/amenities/storage.webp',
    imageUrl: '/images/amenities/storage.webp',
    description: 'Luggage Storage' 
  },
  { 
    title: 'Bicycle parking',  
    icon: '/images/amenities/cycle-parking.webp',
    imageUrl: '/images/amenities/cycle-parking.webp',
    description: 'Bicycle parking' 
  },
  { 
    title: 'Community area with co-working space ',  
    icon: '/images/amenities/co-working.webp',
    imageUrl: '/images/amenities/co-working.webp',
    description: 'Community area with co-working space ' 
  },
  { 
    title: 'Virtual concierge “Charlie” available 24/7',  
    icon: '/images/amenities/service.webp',
    imageUrl: '/images/amenities/service.webp',
    description: 'Virtual concierge “Charlie” available 24/7' 
  },
]

