import { unstable_cache } from 'next/cache';

export interface GoogleReview {
  name: string;
  review: string;
  rating: number;
}

interface PlacesApiReview {
  authorAttribution: {
    displayName: string;
  };
  text?: {
    text: string;
  };
  rating: number;
}

interface PlacesApiResponse {
  reviews?: PlacesApiReview[];
}

const PLACE_ID = 'ChIJLcqNAGFRqEcRKtCsPXjE0xM';

async function fetchGoogleReviews(): Promise<GoogleReview[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=reviews&key=${apiKey}&languageCode=en`,
    );

    if (!response.ok) return [];

    const data: PlacesApiResponse = await response.json();

    return (data.reviews ?? [])
      .filter((r) => r.text?.text && r.rating >= 4)
      .map((r) => ({
        name: r.authorAttribution.displayName,
        review: r.text!.text,
        rating: r.rating,
      }));
  } catch {
    return [];
  }
}

export const getGoogleReviews = unstable_cache(
  fetchGoogleReviews,
  ['google-reviews'],
  { revalidate: 86400, tags: ['google-reviews'] }, // cache 24h
);
