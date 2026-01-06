
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

export const FAQSectons = [
  {
    id: 0,
    title: 'Check-in & Access',
    items: [
      {
        title: 'How does the online check-in work?',
        p:[
          'At Charlie M, the online check-in is a quick digital step that makes your arrival completely smooth and contactless.',
          'After you book, we\’ll send you a link where you can securely confirm your details and complete the mandatory registration. This allows us to verify your identity, prepare your stay, and activate your personal access PIN.',
          'Once your online check-in is finished, your PIN will be sent to you on the day of your arrival. You\’ll receive it by email and Whatsapp, and it will give you access to both the building and your room.',
          'Because we don\’t have a reception on-site, the online check-in must be completed before you arrive — otherwise we won\’t be able to generate your access code',
        ]
      },
      {
        title: 'When will I receive my access PIN?',
        p:[
          'Your access PIN is generated only after you complete the online check-in. You\’ll receive it on the day of arrival by email and Whatsapp, typically by early afternoon. This PIN is needed to enter both the building and your room.',
        ]
      },
      {
        title: 'Which doors can I open with my PIN?',
        p:[
          'Your personal PIN gives you access to everything you need during your stay. With this code, you can open the main entrance, your room door, the laundry room, and the luggage locker room. No keys or cards needed—just one PIN for all areas.',
        ]
      },
      {
        title: 'Can I store my luggage in the hotel?',
        p:[
          'We offer secure free luggage lockers in the building where you can store your bags before check-in or after check-out. If no lockers are available at the moment, you\’ll find a nearby alternative at Stasher Luggage Storage, Friedrichstraße 56, 10117 Berlin.',
        ]
      },
    ]
  },
  {
    id: 1,
    title: 'During Your Stay',
    items: [
      {
        title: 'How do I contact support if I need help?',
        p:[
          'If you need help at any time, our team is available 24/7. You can send us a message on WhatsApp, or call us directly by phone. We\’re always here to support you during your stay.',
        ]
      },
      {
        title: 'How often is my apartment cleaned?',
        p:[
          'Your apartment is thoroughly cleaned and prepared before your arrival. For stays longer than 7 nights, we offer a complimentary weekly cleaning. If you\’d like an additional refresh at any time, you can book an extra cleaning for X.',
        ]
      },
      {
        title: 'Where can I get fresh towels and extra amenities?',
        p:[
          'You\’re welcome to take fresh towels and extra amenities from our Essentials Closet whenever you like. It’s available and free for you at all times.',
        ]
      },
      {
        title: 'Is smoking allowed?',
        p:[
          'Smoking inside the room is strictly forbidden. It\’s only allowed on private balconies or on the shared terrace. If your room doesn\’t include these outdoor spaces, please smoke outside the building.',
        ]
      },
      {
        title: 'Can I do my laundry in the hotel?',
        p:[
          'Absolutely. A guest laundry room is available on-site, so you can wash your clothes whenever you need.',
        ]
      },


    ]
  },
  {
    id: 2,
    title: 'Extra Services',
    items: [
      {
        title: 'Which extra services are available at the hotel?',
        p:[
          'We offer several extra services to make your stay even more comfortable, including breakfast, parking, early check-in, late check-out, and special packages. You can book any of these extras directly on our website or simply add them to your existing reservation.',
        ]
      },
      {
        title: 'Are pets allowed?',
        p:[
          'Yes, pets are welcome! We charge a one-time fee of X for the entire stay, and your fluffy friend can enjoy the trip with you.',
        ]
      },
    ]
  },
  {
    id: 3,
    title: 'Booking adjustments',
    items: [
      {
        title: 'How do I change or cancel my reservation?',
        p:[
          'If you booked directly through the Charlie M website, you can easily change or cancel your reservation in your guest account.',
          'For flexible rates, any eligible refund will be automatically returned to your original payment method.',
          'If your booking was made through a partner platform (such as Booking.com, Airbnb, or Expedia), please make any changes or cancellations directly on that platform. Refunds will also be handled by the provider you booked with.',
        ]
      },
      {
        title: 'When can I receive my invoice?',
        p:[
          'You can receive your invoice after your stay. As soon as you check out, your invoice will be available for download or can be sent to you upon request.'
          ]
      },
    ]
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


export const extraItems = [
  {
    id: '1',
    title: 'Extra Bed',
    price: 10,
    period: 'night',
    description: 'Extra Bed',
    imageUrl: '/images/extra-2.png',  
  },
  {
    id: '2',
    title: 'Breakfast',
    price: 10,
    period: 'night',
    description: 'Breakfast',
    imageUrl: '/images/extra-1.png',
  },
  {
    id: '3',
    title: 'Parking',
    price: 10,
    period: 'night',
    description: 'Parking',
    imageUrl: '/images/extra-3.png',
  },
  {
    id: '4',
    title: 'Tax',
    price: 10,
    period: 'night',
    description: 'Tax',
    imageUrl: '/images/extra-3.png',
  },
]


export const reviews = [
  {
    name: 'Sarah Mitchell',
    review: 'Absolutely stunning hotel! The rooms are spacious and beautifully designed. The staff went above and beyond to make our stay memorable. The breakfast buffet was incredible with so many options. Will definitely be returning!',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    review: 'Great location in the heart of the city. The room was clean and comfortable, though a bit smaller than expected. The concierge service was very helpful with restaurant recommendations. Overall a pleasant stay.',
    rating: 4,
  },
  {
    name: 'Emma Thompson',
    review: 'Perfect weekend getaway! The spa facilities are top-notch and the rooftop bar has amazing views. The bed was incredibly comfortable - best sleep I\'ve had in ages. Highly recommend the deluxe suite!',
    rating: 5,
  },
  {
    name: 'David Rodriguez',
    review: 'The hotel has a modern, elegant design. Service was professional and efficient. Only minor issue was the WiFi being a bit slow in our room, but it was manageable. Great value for money.',
    rating: 4,
  },
  {
    name: 'Olivia Williams',
    review: 'Exceeded all expectations! From the moment we arrived, the staff made us feel special. The room had a beautiful view and was spotlessly clean. The restaurant serves delicious food. Can\'t wait to come back!',
    rating: 5,
  },
  {
    name: 'James Anderson',
    review: 'Nice hotel with good amenities. The gym is well-equipped and the pool area is relaxing. Room service was prompt. The only downside was some noise from the street, but earplugs helped.',
    rating: 4,
  },
  {
    name: 'Sophie Martin',
    review: 'Luxurious experience from start to finish! The attention to detail is impressive - fresh flowers in the room, turn-down service, premium toiletries. The location is perfect for exploring the city. Worth every penny!',
    rating: 5,
  },
  {
    name: 'Robert Taylor',
    review: 'Comfortable stay for business travel. The conference facilities are excellent and the business center is well-equipped. Staff was accommodating with early check-in. Good selection of restaurants nearby.',
    rating: 4,
  },
  {
    name: 'Isabella Garcia',
    review: 'Beautiful hotel with incredible architecture. The lobby is breathtaking and the rooms are tastefully decorated. The spa treatments were relaxing. Only wish we could have stayed longer!',
    rating: 5,
  },
  {
    name: 'Thomas Brown',
    review: 'Solid hotel experience. Clean rooms, friendly staff, and good location. The breakfast was decent but could use more variety. Parking was convenient. Would stay here again for the price point.',
    rating: 4,
  },
  {
    name: 'Charlotte Davis',
    review: 'Absolutely loved our stay! The hotel has a unique charm and character. The staff remembered our names and preferences. The room was spacious with a lovely balcony. Perfect romantic getaway destination!',
    rating: 5,
  },
  {
    name: 'Daniel Wilson',
    review: 'Good hotel overall. The facilities are modern and well-maintained. The bar has a nice atmosphere in the evenings. Room was comfortable but the air conditioning was a bit noisy. Still a pleasant stay.',
    rating: 3,
  },
  {
    name: 'Amelia Moore',
    review: 'Exceptional service and beautiful accommodations! Every detail was perfect - from the welcome drink to the personalized note in our room. The rooftop pool is a must-visit. Truly a five-star experience!',
    rating: 5,
  },
  {
    name: 'Christopher Lee',
    review: 'Nice hotel with great amenities. The fitness center is impressive and the pool area is well-designed. Staff was helpful with local recommendations. Room was clean and comfortable. Good value.',
    rating: 4,
  },

] 