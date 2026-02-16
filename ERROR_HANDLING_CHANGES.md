# Error Handling Implementation

## Files Changed

### 1. `app/[locale]/rooms/components/ErrorCard.tsx`

```typescript
"use client";

import { Link } from "@/navigation";
import { Button } from "@/app/_components/ui/button";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

const ErrorCard = ({
  link,
  isSingleRoom = false,
}: {
  link?: string;
  isSingleRoom?: boolean;
}) => {
  const t = useTranslations();

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="container px-4 md:px-[100px] py-20 text-center">
      <div className="flex justify-center mb-6">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-700 mb-4">
        {isSingleRoom ? t("errors.roomLoadError") : t("errors.roomsLoadError")}
      </h2>
      <p className="text-gray-600 mb-6">
        {t("errors.pleaseTryAgain")}
      </p>
      <div className="flex gap-4 justify-center">
        <Button onClick={handleReload} variant="default">
          {t("errors.reloadPage")}
        </Button>
        {isSingleRoom && link && (
          <Link href={link}>
            <Button variant="outline">
              ← {t("errors.backToRooms")}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ErrorCard;
```

### 2. `app/[locale]/home/components/RoomsErrorBoundary.tsx` (NEW FILE)

```typescript
"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

interface Props {
  children: ReactNode;
  locale: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class RoomsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("RoomsErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isGerman = this.props.locale === "de";

      return (
        <div className="container px-4 md:px-[100px] py-20 text-center">
          <div className="flex justify-center mb-6">
            <AlertTriangle className="w-16 h-16 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            {isGerman
              ? "Wir konnten die Zimmer nicht laden"
              : "We couldn't load the rooms right now"}
          </h2>
          <p className="text-gray-600 mb-6">
            {isGerman
              ? "Etwas ist schiefgelaufen. Bitte laden Sie die Seite neu oder versuchen Sie es später erneut."
              : "Something went wrong. Please reload the page or try again later."}
          </p>
          <Button onClick={this.handleReload} variant="default">
            {isGerman ? "Seite neu laden" : "Reload Page"}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RoomsErrorBoundary;
```

### 3. `app/[locale]/home/RoomsSection.tsx`

```typescript
import { RoomsCarousel } from "@/app/[locale]/home/components/RoomsCarousel";
import { getAvailableRooms } from "@/services/getAvailableRooms";
import ErrorCard from "@/app/[locale]/rooms/components/ErrorCard";
import { getTranslations } from "next-intl/server";
import Header from "@/app/[locale]/home/components/Header";
import { RATE_PLANS } from "@/lib/Constants";

const RoomsSection = async ({ locale }: { locale: string }) => {
  try {
    const rooms = await getAvailableRooms();
    const t = await getTranslations({ locale });

    // Show fallback UI if error object returned
    if ("error" in rooms) {
      console.error("Error loading rooms:", rooms.error);
      return <ErrorCard link="/" isSingleRoom={false} />;
    }

    // Show fallback UI if no rooms available
    if (!rooms || rooms.length === 0) {
      console.log("No rooms available");
      return <ErrorCard link="/" isSingleRoom={false} />;
    }

    const standartPriceRooms = rooms.filter((room) =>
      room.ratePlan.code.includes(RATE_PLANS.STANDARD)
    );

    // If no standard rooms found, show error
    if (standartPriceRooms.length === 0) {
      console.log("No standard price rooms available");
      return <ErrorCard link="/" isSingleRoom={false} />;
    }

    const roomCardTranslations = {
      perNightFrom: t("roomCard.perNightFrom"),
      loading: t("roomCard.loading"),
      bookNow: t("roomCard.bookNow"),
    };

    return (
      <div id="rooms" className="w-full flex flex-col pt-15">
        <Header title={t("home.rooms_title")} />
        <span className="w-full text-dark text-lg text-center mb-12">
          {t("home.rooms_subtitle")}
        </span>
        <RoomsCarousel
          items={standartPriceRooms}
          locale={locale}
          translations={roomCardTranslations}
        />
      </div>
    );
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in RoomsSection:", error);
    return <ErrorCard link="/" isSingleRoom={false} />;
  }
};

export default RoomsSection;
```

### 4. `app/[locale]/page.tsx`

Add import:

```typescript
import RoomsErrorBoundary from "@/app/[locale]/home/components/RoomsErrorBoundary";
```

Update JSX:

```typescript
<RoomsErrorBoundary locale={locale}>
  <Suspense fallback={<RoomsFallback />}>
    <RoomsSection locale={locale} />
  </Suspense>
</RoomsErrorBoundary>;
```

### 5. `services/getRoomsDetails.ts`

```typescript
import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface RoomDetails {
  id: string;
  group_name: string;
  attributes: string[];
  max_persons: number;
  size: number;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export async function getRoomsDetails(): Promise<RoomDetails[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching rooms from Supabase:", error);
      // Return empty array as fallback instead of throwing
      // This allows the main flow to continue with Apaleo data
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in getRoomsDetails:", error);
    // Return empty array as fallback
    return [];
  }
}
```

### 6. `services/getAvailableRooms.tsx`

```typescript
import { Fetch } from "./Request";
import dayjs from "dayjs";
import { cache } from "react";
import { OfferResponse, RoomOffer } from "@/types/offers";
import { getRoomsDetails } from "./getRoomsDetails";
const propId = process.env.APALEO_PROPERTY_ID;

type GetAvailableRoomsResult = RoomOffer[] | { error: string };

const getAvailableRoomsInternal = async (
  from?: string,
  to?: string,
  guests: number = 1,
): Promise<GetAvailableRoomsResult> => {
  if (!propId) {
    console.error("APALEO_PROPERTY_ID is not set in environment variables");
    return { error: "Property ID is required. Set APALEO_PROPERTY_ID in .env" };
  }

  let arrival = from || dayjs().add(1, "day").format("YYYY-MM-DD");
  let departure = to || dayjs().add(2, "day").format("YYYY-MM-DD");

  // Validate that departure is at least 1 day after arrival
  if (arrival === departure) {
    departure = dayjs(arrival).add(1, "day").format("YYYY-MM-DD");
  } else if (dayjs(departure).isBefore(dayjs(arrival))) {
    const temp = arrival;
    arrival = departure;
    departure = dayjs(temp).add(1, "day").format("YYYY-MM-DD");
  }

  try {
    // Fetch single room offers
    const singleRoomResponse = await Fetch<OfferResponse>(
      `/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=1`,
    ).then((res) => res.offers);

    if (!singleRoomResponse || singleRoomResponse.length === 0) {
      console.log("No rooms available for selected dates");
      return { error: "No rooms available for selected dates" };
    }

    // Fetch double room data (optional, don't fail if it errors)
    const doubleRoomResponse = await Fetch<OfferResponse>(
      `/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=2`,
    )
      .then((res) => res.offers)
      .catch((error) => {
        console.warn("Failed to fetch double room data:", error.message);
        return undefined;
      });

    // Fetch room details from Supabase (with fallback to empty array)
    const roomsDetails = await getRoomsDetails();

    // Format rooms with all available data
    const formattedRooms = singleRoomResponse.map((room) => {
      const roomDetails = roomsDetails.find((item) =>
        item.id === room.unitGroup.id
      );
      const doubleRoom = doubleRoomResponse?.find(
        (dr) =>
          dr.unitGroup.id === room.unitGroup.id &&
          dr.ratePlan.id === room.ratePlan.id,
      );

      return {
        ...room,
        images: roomDetails?.photos || [],
        id: `${room.unitGroup.id}-${room.ratePlan.id}`,
        name: room.unitGroup.name,
        description: room.unitGroup.description,
        price: room.totalGrossAmount.amount,
        priceForTwo: (doubleRoom?.totalGrossAmount?.amount || 0),
        oneNightPrice: (room.timeSlices?.[0]?.totalGrossAmount?.amount || 0),
        oneNightPriceForTwo:
          (doubleRoom?.timeSlices?.[0]?.totalGrossAmount?.amount || 0),
        cityTax: (room.cityTaxes?.[0]?.totalGrossAmount?.amount || 0),
        cityTaxForTwo:
          (doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || 0),
        currency: room.totalGrossAmount.currency,
        attributes: roomDetails?.attributes || [],
        size: roomDetails?.size || 0,
        maxPersons: roomDetails?.max_persons || 1,
      };
    });

    // Filter rooms based on guest count
    const availableRooms = guests < 2
      ? formattedRooms
      : formattedRooms.filter((room) => {
        const volume = room.maxPersons * room.availableUnits;
        return volume >= guests;
      });

    return availableRooms as RoomOffer[];
  } catch (e: any) {
    console.error("Get Rooms error:", e);
    console.error("Error details:", {
      message: e.message,
      stack: e.stack,
      arrival,
      departure,
      guests,
    });

    // Return error object instead of empty array
    return {
      error: e.message || "Failed to fetch rooms. Please try again later.",
    };
  }
};

export const getAvailableRooms = cache(getAvailableRoomsInternal);
```

### 7. `services/getSingleRoom.ts`

Add type at top:

```typescript
type GetSingleRoomResult = RoomOffer[] | { error: string };
```

Update function signature:

```typescript
const getSingleRoomInternal = async (roomId: string, from?: string, to?: string, adults?: string): Promise<GetSingleRoomResult> => {
```

### 8. `app/hooks/useExtensionRooms.ts`

Add interface:

```typescript
interface ExtensionRoomsResponse {
  availableUnits: number;
  babyBedAvailable?: boolean;
  message?: string;
}
```

Update return type:

```typescript
mutationFn: async ({ from, to, roomId, isBaby }: ExtensionRoomsParams): Promise<ExtensionRoomsResponse> => {
```

Update return:

```typescript
const data: ExtensionRoomsResponse = await response.json();
```

### 9. `app/api/rooms/extension/route.ts`

Add interfaces at top:

```typescript
interface ExtensionResponse {
  availableUnits: number;
  babyBedAvailable?: boolean;
  message?: string;
}

interface ErrorResponse {
  error: string;
}
```

Update function signature:

```typescript
export async function GET(request: NextRequest): Promise<NextResponse<ExtensionResponse | ErrorResponse>> {
```

Update error handling:

```typescript
// Check room availability - type guard for error
if ("error" in room) {
  return NextResponse.json({
    availableUnits: 0,
    message: room.error,
  });
}

// room is now typed as RoomOffer[]
if (room.length === 0) {
  return NextResponse.json({
    availableUnits: 0,
    message: "No rooms available for selected dates",
  });
}

const firstRoom = room[0];
const availableUnits = firstRoom.availableUnits ?? 0;
```

### 10. `app/[locale]/profile/reservations/[id]/components/ExtandYourStay.tsx`

Update onSuccess:

```typescript
onSuccess: ((data) => {
  // data is always an object with availableUnits (number) and babyBedAvailable (boolean | undefined)
  setAvailableUnits(data.availableUnits);
  setBabyBedAvailable(data.babyBedAvailable ?? null);
});
```

### 11. `language/en.json`

Add before last closing brace:

```json
"errors": {
  "roomLoadError": "We couldn't load the room right now",
  "roomsLoadError": "We couldn't load the rooms right now",
  "pleaseTryAgain": "Something went wrong. Please reload the page or try again later.",
  "reloadPage": "Reload Page",
  "backToRooms": "Back to all rooms"
}
```

### 12. `language/de.json`

Add before last closing brace:

```json
"errors": {
  "roomLoadError": "Wir konnten das Zimmer nicht laden",
  "roomsLoadError": "Wir konnten die Zimmer nicht laden",
  "pleaseTryAgain": "Etwas ist schiefgelaufen. Bitte laden Sie die Seite neu oder versuchen Sie es später erneut.",
  "reloadPage": "Seite neu laden",
  "backToRooms": "Zurück zu allen Zimmern"
}
```

## Summary

- Created 1 new file: `RoomsErrorBoundary.tsx`
- Modified 11 existing files
- Added error translations (EN/DE)
- All errors now handled gracefully with reload button

---

## Additional Changes for Rooms Page

### 13. `app/[locale]/rooms/page.tsx`

```typescript
const RoomsPage = async ({ searchParams }: Props) => {
  const { from, to, adults, children } = await searchParams;

  try {
    const adultsCount = adults ? Number(adults) : 1;

    const [rooms, babyBedAvailability] = await Promise.all([
      getAvailableRooms(from, to, adultsCount),
      from && to
        ? getServiceAvailabilityById(from, to, "CMH-BAB")
        : Promise.resolve({ isAvailable: false, count: 0 }),
    ]);

    // Handle error from getAvailableRooms
    if ("error" in rooms) {
      console.error("Error loading rooms:", rooms.error);
      console.error("Search params:", { from, to, adults, children });
      return (
        <>
          <StickyCheckInFormRooms params={{ from, to, adults, children }} />
          <Filters />
          <ErrorCard />
        </>
      );
    }

    // Handle empty rooms array
    if (!rooms || rooms.length === 0) {
      console.log("No rooms available for search params:", {
        from,
        to,
        adults,
        children,
      });
      return (
        <>
          <StickyCheckInFormRooms params={{ from, to, adults, children }} />
          <Filters />
          <NotFoundCard />
        </>
      );
    }

    const nights = calculateNights(from as string, to as string);
    const ratePlan = nights > 7 ? RATE_PLANS.LONG_STAY : RATE_PLANS.STANDARD;
    const standardPriceRooms = rooms.filter((room) =>
      room.ratePlan.code.includes(ratePlan)
    );

    // Handle no standard price rooms
    if (standardPriceRooms.length === 0) {
      console.log("No standard price rooms available for:", {
        ratePlan,
        nights,
      });
      return (
        <>
          <StickyCheckInFormRooms params={{ from, to, adults, children }} />
          <Filters />
          <NotFoundCard />
        </>
      );
    }

    return (
      <>
        <StickyCheckInFormRooms params={{ from, to, adults, children }} />
        <Filters />
        <RoomsList
          rooms={standardPriceRooms}
          params={{ from, to, adults, children }}
          isBabyBedAvailable={babyBedAvailability}
        />
      </>
    );
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in RoomsPage:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return (
      <>
        <StickyCheckInFormRooms params={{ from, to, adults, children }} />
        <Filters />
        <ErrorCard />
      </>
    );
  }
};
```

### 14. `app/[locale]/rooms/[id]/components/NotFoundCard.tsx`

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/ui/button";
import { Link } from "@/navigation";

const NotFoundCard = ({
  text,
}: {
  text?: string;
}) => {
  const t = useTranslations();

  return (
    <div className="container px-4 md:px-[100px] py-20 text-center">
      <h2 className="text-2xl font-bold text-gray-700 mb-4">
        {text || t("errors.noRoomsFound")}
      </h2>
      <p className="text-gray-600 mb-6">
        {t("errors.tryDifferentDates")}
      </p>
    </div>
  );
};

export default NotFoundCard;
```

**Note:** No "View All Rooms" button - user is already on /rooms page

### 15. `language/en.json`

Update errors section:

```json
"errors": {
  "roomLoadError": "We couldn't load the room right now",
  "roomsLoadError": "We couldn't load the rooms right now",
  "pleaseTryAgain": "Something went wrong. Please reload the page or try again later.",
  "reloadPage": "Reload Page",
  "backToRooms": "Back to all rooms",
  "noRoomsFound": "No rooms found",
  "tryDifferentDates": "Please try different dates or change your search criteria.",
  "viewAllRooms": "View All Rooms"
}
```

### 16. `language/de.json`

Update errors section:

```json
"errors": {
  "roomLoadError": "Wir konnten das Zimmer nicht laden",
  "roomsLoadError": "Wir konnten die Zimmer nicht laden",
  "pleaseTryAgain": "Etwas ist schiefgelaufen. Bitte laden Sie die Seite neu oder versuchen Sie es später erneut.",
  "reloadPage": "Seite neu laden",
  "backToRooms": "Zurück zu allen Zimmern",
  "noRoomsFound": "Keine Zimmer gefunden",
  "tryDifferentDates": "Bitte versuchen Sie andere Daten oder ändern Sie Ihre Suchkriterien.",
  "viewAllRooms": "Alle Zimmer anzeigen"
}
```

## Final Summary

- Created 3 new files: `RoomsErrorBoundary.tsx`, `NoRoomsAvailable.tsx`,
  `RoomErrorCard.tsx`
- Modified 13 existing files
- Added comprehensive error handling for Home Page, Rooms Page, and Single Room
  Page
- All errors logged to console for debugging
- User-friendly error messages with reload/navigation buttons

---

## Additional Component for Single Room Page

### 21. `app/[locale]/rooms/[id]/components/RoomErrorCard.tsx` (NEW FILE)

```typescript
"use client";

import { Button } from "@/app/_components/ui/button";
import { useRouter } from "@/navigation";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

const RoomErrorCard = () => {
  const router = useRouter();
  const t = useTranslations();

  const handleReload = () => {
    window.location.reload();
  };

  const handleBackToRooms = () => {
    router.push("/rooms");
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-[20px] border col-span-2 xl:col-span-3">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
        </div>

        <h2 className="text-2xl font-bold mb-3">
          {t("errors.roomLoadError")}
        </h2>

        <p className="text-dark mb-6 text-base">
          {t("errors.pleaseTryAgain")}
        </p>

        <div className="flex gap-3 w-full max-w-xs">
          <Button
            onClick={handleReload}
            variant="default"
            className="flex-1 h-12"
          >
            {t("errors.reloadPage")}
          </Button>
          <Button
            onClick={handleBackToRooms}
            variant="outline"
            className="flex-1 h-12"
          >
            {t("errors.backToRooms")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomErrorCard;
```

### 22. Update `app/[locale]/rooms/[id]/page.tsx`

Add import:

```typescript
import RoomErrorCard from "./components/RoomErrorCard";
```

Update RoomPage component with full error handling:

```typescript
const RoomPage = async ({ params, searchParams }: IParams) => {
  const { id } = await params;
  const { from, to, adults, children } = await searchParams;

  try {
    const [rooms, babyBedAvailability] = await Promise.all([
      getSingleRoom(id, from, to, adults),
      from && to
        ? getServiceAvailabilityById(from, to, "CMH-BAB")
        : Promise.resolve({ isAvailable: false, count: 0 }),
    ]);

    // Handle error from getSingleRoom
    if ("error" in rooms) {
      console.error("Error loading room:", rooms.error);
      console.error("Room ID:", id);
      console.error("Search params:", { from, to, adults, children });
      return (
        <div className="flex flex-col relative pt-10 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]">
            <RoomErrorCard />
          </div>
        </div>
      );
    }

    // Handle empty rooms array
    if (!rooms || rooms.length === 0) {
      console.log("No rooms found for ID:", id);
      console.log("Search params:", { from, to, adults, children });
      return (
        <div className="flex flex-col relative pt-10 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]">
            <NoAvailabilityCard from={from} to={to} />
          </div>
        </div>
      );
    }

    const room = rooms[0];

    // Handle missing room data
    if (!room) {
      console.error("Room data is undefined for ID:", id);
      return (
        <div className="flex flex-col relative pt-10 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]">
            <RoomErrorCard />
          </div>
        </div>
      );
    }

    const totalAdults = adults ? Number(adults) : 1;
    const maxCapacity = room.availableUnits * room.maxPersons;
    const hasEnoughCapacity = totalAdults <= maxCapacity;
    const isKidsBedAvailable = room.attributes?.includes("kids") || false;

    return (
      <div className="flex flex-col relative pt-10 flex-1">
        <PhotoGallery images={room.images} roomName={room.name} />
        <div className="grid grid-cols-1  lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]">
          {hasEnoughCapacity
            ? (
              <div className="col-span-2 xl:col-span-3 flex flex-col">
                <RoomContent room={room} isRoomInfo={true} />
                <Availability
                  id={id}
                  from={from}
                  to={to}
                  children={children}
                  adults={adults}
                />
              </div>
            )
            : (
              <NoCapacityWarning
                totalAdults={totalAdults}
                from={from}
                to={to}
                adults={adults}
                children={children}
              />
            )}
          <div className="col-span-1">
            <BookingForm
              id={id}
              rooms={rooms}
              params={{
                from: from || undefined,
                to: to || undefined,
                adults: adults || undefined,
                children: children || undefined,
              }}
              babyBedAvailability={babyBedAvailability}
              isKidsBedAvailable={isKidsBedAvailable}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in RoomPage:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error("Room ID:", id);
    console.error("Search params:", { from, to, adults, children });
    return (
      <div className="flex flex-col relative pt-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 md:gap-10 mb-[30px]">
          <RoomErrorCard />
        </div>
      </div>
    );
  }
};
```

Update generateMetadata with error handling:

```typescript
export async function generateMetadata(
  { params, searchParams }: IParams,
): Promise<Metadata> {
  const { id, locale } = await params;
  const { from, to, adults, children } = await searchParams;
  const isGerman = locale === "de";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";

  const hasQueryParams = !!(from || to || adults || children);

  try {
    const rooms = await getSingleRoom(id, from, to, adults);

    if ("error" in rooms) {
      console.error("Error in generateMetadata for room:", id, rooms.error);
      return {
        title: isGerman ? "Zimmer nicht gefunden" : "Room not found",
        description: isGerman
          ? "Das gesuchte Zimmer wurde nicht gefunden."
          : "The room you are looking for was not found.",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    if (!rooms || rooms.length === 0) {
      console.log("No rooms found in generateMetadata for ID:", id);
      return {
        title: isGerman ? "Zimmer nicht verfügbar" : "Room not available",
        description: isGerman
          ? "Das Zimmer ist derzeit nicht verfügbar."
          : "The room is currently not available.",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const nights = calculateNights(from as string, to as string);
    const type = nights > 7 ? RATE_PLANS.LONG_STAY : RATE_PLANS.STANDARD;
    const filteredRooms = rooms.filter((room) =>
      room.ratePlan.code.includes(type)
    );
    const room = filteredRooms[0];

    if (!room) {
      console.error("Room data is undefined in generateMetadata for ID:", id);
      return {
        title: isGerman ? "Zimmer nicht gefunden" : "Room not found",
        description: isGerman
          ? "Das gesuchte Zimmer wurde nicht gefunden."
          : "The room you are looking for was not found.",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    // ... rest of metadata generation
  } catch (error) {
    console.error("Unexpected error in generateMetadata for room:", id, error);
    return {
      title: isGerman ? "Fehler beim Laden" : "Error loading room",
      description: isGerman
        ? "Ein Fehler ist aufgetreten."
        : "An error occurred.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}
```

---

## Additional Component for Home Page

### 17. `app/[locale]/home/components/NoRoomsAvailable.tsx` (NEW FILE)

```typescript
"use client";

import { useTranslations } from "next-intl";

const NoRoomsAvailable = () => {
  const t = useTranslations();

  return (
    <div className="container px-4 md:px-[100px] py-20 pt-0 text-center">
      <h2 className="text-2xl font-bold text-gray-700 mb-4">
        {t("errors.noRoomsAvailableNearDates")}
      </h2>
      <p className="text-gray-600">
        {t("errors.pleaseSelectDifferentDates")}
      </p>
    </div>
  );
};

export default NoRoomsAvailable;
```

**Note:** No icon, no button - just message. Used on Home Page only.

### 18. Update `app/[locale]/home/RoomsSection.tsx`

Add import:

```typescript
import NoRoomsAvailable from "@/app/[locale]/home/components/NoRoomsAvailable";
```

**FULL FILE CONTENT:**

```typescript
import { RoomsCarousel } from "@/app/[locale]/home/components/RoomsCarousel";
import { getAvailableRooms } from "@/services/getAvailableRooms";
import ErrorCard from "@/app/[locale]/rooms/components/ErrorCard";
import NoRoomsAvailable from "@/app/[locale]/home/components/NoRoomsAvailable";
import { getTranslations } from "next-intl/server";
import Header from "@/app/[locale]/home/components/Header";
import { RATE_PLANS } from "@/lib/Constants";

const RoomsSection = async ({ locale }: { locale: string }) => {
  try {
    const rooms = await getAvailableRooms();
    const t = await getTranslations({ locale });

    // Show fallback UI if error object returned
    if ("error" in rooms) {
      console.error("Error loading rooms:", rooms.error);
      return (
        <div id="rooms" className="w-full flex flex-col pt-15">
          <Header title={t("home.rooms_title")} />
          <span className="w-full text-dark text-lg text-center mb-12">
            {t("home.rooms_subtitle")}
          </span>
          <ErrorCard link="/" isSingleRoom={false} />
        </div>
      );
    }

    // Show fallback UI if no rooms available
    if (!rooms || rooms.length === 0) {
      console.log("No rooms available");
      return (
        <div id="rooms" className="w-full flex flex-col pt-15">
          <Header title={t("home.rooms_title")} />
          <span className="w-full text-dark text-lg text-center mb-12">
            {t("home.rooms_subtitle")}
          </span>
          <NoRoomsAvailable />
        </div>
      );
    }

    const standartPriceRooms = rooms.filter((room) =>
      room.ratePlan.code.includes(RATE_PLANS.STANDARD)
    );

    // If no standard rooms found, show no rooms available
    if (standartPriceRooms.length === 0) {
      console.log("No standard price rooms available");
      return (
        <div id="rooms" className="w-full flex flex-col pt-15">
          <Header title={t("home.rooms_title")} />
          <span className="w-full text-dark text-lg text-center mb-12">
            {t("home.rooms_subtitle")}
          </span>
          <NoRoomsAvailable />
        </div>
      );
    }

    const roomCardTranslations = {
      perNightFrom: t("roomCard.perNightFrom"),
      loading: t("roomCard.loading"),
      bookNow: t("roomCard.bookNow"),
    };

    return (
      <div id="rooms" className="w-full flex flex-col pt-15">
        <Header title={t("home.rooms_title")} />
        <span className="w-full text-dark text-lg text-center mb-12">
          {t("home.rooms_subtitle")}
        </span>
        <RoomsCarousel
          items={standartPriceRooms}
          locale={locale}
          translations={roomCardTranslations}
        />
      </div>
    );
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in RoomsSection:", error);
    const t = await getTranslations({ locale });
    return (
      <div id="rooms" className="w-full flex flex-col pt-15">
        <Header title={t("home.rooms_title")} />
        <span className="w-full text-dark text-lg text-center mb-12">
          {t("home.rooms_subtitle")}
        </span>
        <ErrorCard link="/" isSingleRoom={false} />
      </div>
    );
  }
};

export default RoomsSection;
```

**Key changes:**

- ALWAYS show Header and Subtitle in all cases (success, error, no rooms)
- Wrap error/no-rooms states with proper div structure
- Use NoRoomsAvailable for empty results

### 19. Update `language/en.json`

Add to errors section:

```json
"noRoomsAvailableNearDates": "No rooms available for the nearest dates",
"pleaseSelectDifferentDates": "Please try selecting different dates"
```

### 20. Update `language/de.json`

Add to errors section:

```json
"noRoomsAvailableNearDates": "Keine Zimmer für die nächsten Termine verfügbar",
"pleaseSelectDifferentDates": "Bitte versuchen Sie andere Daten auszuwählen"
```
