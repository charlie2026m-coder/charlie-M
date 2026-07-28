import { NextResponse } from 'next/server';

const PLACE_ID = 'ChIJLcqNAGFRqEcRKtCsPXjE0xM';

/** Only review CARDS at or above this rating are rendered on the site.
 *  The aggregate `rating` / `userRatingCount` returned below stay untouched —
 *  they remain Google's real numbers over ALL reviews — and every block links
 *  out to Google, so the overall score is never misrepresented. */
const MIN_DISPLAYED_RATING = 4;

type PlaceReview = {
  authorAttribution: { displayName: string; uri?: string; photoUri?: string };
  rating: number;
  text?: { text: string };
  relativePublishTimeDescription: string;
  googleMapsUri?: string;
};

export const revalidate = 86400; // cache for 24 hours

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Google API key is missing' }, { status: 500 });
  }

  const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=reviews,rating,userRatingCount,googleMapsUri&languageCode=en&key=${apiKey}`;

  const response = await fetch(url, {
    headers: {
      'X-Goog-FieldMask': 'reviews,rating,userRatingCount,googleMapsUri',
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[reviews] Google Places API error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: response.status });
  }

  const data = await response.json();

  return NextResponse.json({
    rating: data.rating ?? null,
    userRatingCount: data.userRatingCount ?? null,
    // Where to send the guest to read/leave reviews on Google.
    googleMapsUri: data.googleMapsUri ?? null,
    reviewsUrl: `https://search.google.com/local/reviews?placeid=${PLACE_ID}`,
    reviews: ((data.reviews ?? []) as PlaceReview[])
      .filter((r) => r.rating >= MIN_DISPLAYED_RATING)
      .map((r) => ({
        name: r.authorAttribution.displayName,
        rating: r.rating,
        review: r.text?.text ?? '',
        time: r.relativePublishTimeDescription,
        // Link straight to this review (and the author) on Google.
        reviewUri: r.googleMapsUri ?? null,
        authorUri: r.authorAttribution?.uri ?? null,
        photoUri: r.authorAttribution?.photoUri ?? null,
      })),
  });
}
