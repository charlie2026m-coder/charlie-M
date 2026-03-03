export function getExtraImages(serviceId: string, serviceName?: string, imageUrl?: string | null): string[] {
  const imageMap: Record<string, string[]> = {
    // Baby Bed
    'CMH-BAB': ['/images/services/baby-1.webp', '/images/services/baby-2.webp'],
    
    // Check-in/Check-out
    'CMH-ECI': ['/images/services/checkin-1.webp', '/images/services/checkin-2.webp'], // Early Check-in
    'CMH-LCO': ['/images/services/checkout-1.webp', '/images/services/checkout-2.webp'], // Late Check-out
    
    // Breakfast
    'CMH-BRK': ['/images/services/breakfast-1.webp', '/images/services/breakfast-2.webp'],
    'CMH-BREAKFAST': ['/images/services/breakfast-1.webp', '/images/services/breakfast-2.webp'],
    
    // Cleaning
    'CMH-CLN': ['/images/services/cleaning-1.webp', '/images/services/cleaning-2.webp'],
    'CMH-CLEANING': ['/images/services/cleaning-1.webp', '/images/services/cleaning-2.webp'],
    
    // Parking
    'CMH-PRK': ['/images/services/parking-1.webp', '/images/services/parking-2.webp'],
    'CMH-PARKING': ['/images/services/parking-1.webp', '/images/services/parking-2.webp'],
    
    // Pets
    'CMH-PET': ['/images/services/pets-1.webp', '/images/services/pets-2.webp'],
    'CMH-PETS': ['/images/services/pets-1.webp', '/images/services/pets-2.webp'],
  };

  const list = imageMap[serviceId]
    ? imageMap[serviceId]
    : (() => {
        if (!serviceName) return ['/images/extra.webp'];
    const nameLower = serviceName.toLowerCase();
    
    if (nameLower.includes('baby') || nameLower.includes('crib') || nameLower.includes('bed')) {
      return ['/images/services/baby-1.webp', '/images/services/baby-2.webp'];
    }
    if (nameLower.includes('breakfast')) {
      return ['/images/services/breakfast-1.webp', '/images/services/breakfast-2.webp'];
    }
    if (nameLower.includes('check-in') || nameLower.includes('early')) {
      return ['/images/services/checkin-1.webp', '/images/services/checkin-2.webp'];
    }
    if (nameLower.includes('check-out') || nameLower.includes('late') || nameLower.includes('checkout')) {
      return ['/images/services/checkout-1.webp', '/images/services/checkout-2.webp'];
    }
    if (nameLower.includes('clean')) {
      return ['/images/services/cleaning-1.webp', '/images/services/cleaning-2.webp'];
    }
    if (nameLower.includes('park')) {
      return ['/images/services/parking-1.webp', '/images/services/parking-2.webp'];
    }
    if (nameLower.includes('pet') || nameLower.includes('dog') || nameLower.includes('cat')) {
      return ['/images/services/pets-1.webp', '/images/services/pets-2.webp'];
    }
        return ['/images/extra.webp'];
      })();
  if (imageUrl?.trim()) return [imageUrl.trim(), ...list];
  return list;
}

export function getExtraImage(serviceId: string, serviceName?: string, imageUrl?: string | null): string {
  return getExtraImages(serviceId, serviceName, imageUrl)[0];
}
