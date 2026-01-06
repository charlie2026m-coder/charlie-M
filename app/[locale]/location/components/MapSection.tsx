"use client";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useMemo } from "react";
import CustomMarker from "./CustomMarker";

const defaultCenter = {
  lat: 52.504992498425274, 
  lng: 13.391040308320248  
};


export default function MapSection({
  height = '700px',
}: {
  height?: string
}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"],
  });

  const hotelMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;

    return {  
      url: '/images/logo-map.svg',
      scaledSize: new google.maps.Size(80, 80),
      anchor: new google.maps.Point(40, 40),
    };
  }, [isLoaded]);



  return (
    <section>
      <h2 className='sr-only'>
        Nearby Attractions
      </h2>
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{
            width: '100%',
            height: height,
          }}
          center={defaultCenter}
          zoom={13}
          options={{
            mapId: "map",
            zoomControl: false, 
            streetViewControl: false, 
            mapTypeControl: false, 
            fullscreenControl: false,
            gestureHandling: "cooperative",
            disableDefaultUI: true,
          }}
        >
          {/* Основной маркер отеля */}
          <Marker position={defaultCenter} icon={hotelMarkerIcon} title="Charlie M Hotel" />
          
          {/* Кастомные маркеры для интересных мест */}
          {Locations.map((place, index) => (
            <CustomMarker
              key={index}
              item={place}
            />
          ))} 
        </GoogleMap>
      ) : (
        <div className="text-white text-center flex items-center justify-center">Loading map...</div>
      )}
    </section>
  );
}

const Locations = [
  {
    title: 'Checkpoint Charlie',
    image: '/images/street.webp',
    distance: '200m',
    walkTime: '5 min', 
    position: { lat: 52.507568531531284,lng:  13.39085829584042, }
    
  },
  {
    title: 'Brandenburg Gate (Brandenburger Tor)',
    image: '/images/location-2.svg',
    distance: '1.6 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.51639862067084,lng: 13.378401472554446, }
 
  },
  {
    title: 'Potsdamer Platz',
    image: '/images/location-3.svg',
    distance: '1.4 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '15 min',
    position: { lat: 52.509296471309916, lng:13.376298417277027, }
     
  },
  {
    title: 'Reichstag & Glass Dome (Deutscher Bundestag)',
    image: '/images/location-4.svg',
    distance: '2 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.518763727555815, lng: 13.376734359111904 }
     
  },
  {
    title: 'Gendarmenmarkt',
    image: '/images/location-5.svg',
    distance: '1 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '10 min',
    position: { lat:52.513329699995126,lng:  13.392952080498011 }
    
  },
  {
    title: 'Museum Island (Museumsinsel)',
    image: '/images/location-6.svg',
    distance: '2 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.51850083469369, 
    lng: 13.400688789322478, }
    
  },
  {
    title: 'Alexanderplatz & TV Tower (Fernsehturm)',
    image: '/images/location-7.svg',
    distance: '2.9 km',
    carTime: '10 min',
    busTime: '15 min',
    walkTime: '40 min',
    position: { lat:52.520965120606746, 
    lng: 13.409826793991215 , }
    
  },
  {
    title: 'Tiergarten',
    image: '/images/location-8.svg',
    distance: '1.5 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '15 min',
    position: { lat: 52.51467283163672,lng: 13.350340222712656, }
     
  },
  {
    title: 'Mall of Berlin',
    image: '/images/location-9.svg',
    distance: '900 m',
    carTime: '5 min',
    walkTime: '10 min',
    position: { lat: 52.510635577461365, lng:13.381190528920152, }
     
  },
  {
    title: 'KaDeWe',
    image: '/images/location-10.svg',
    distance: '4 km',
    carTime: '15 min',
    busTime: '25 min',
    position: { lat: 52.50178494145241,lng: 13.341100286591294, }
     
  },
  {
    title: 'East Side Gallery',
    image: '/images/location-11.svg',
    distance: '3.8 km',
    carTime: '15 min',
    busTime: '20 min',
    position: { lat: 52.50511553277002, 
    lng: 13.439679610694357 }
  },
  {
    title: 'Nikolaiviertel',
    image: '/images/location-12.svg',
    distance: '2.3 km',
    carTime: '10 min',
    busTime: '15 min',
    walkTime: '30 min',
    position: { lat: 52.51750072494429, 
    lng: 13.407166000356913 }
    
  },
  {
    title: 'Kaiser Wilhelm Memorial Church (Gedächtniskirche)',
    image: '/images/location-13.svg',
    distance: '4.4 km',
    carTime: '15 min',
    busTime: '20 min',
    position: {   lat: 52.50496164470728,
    lng: 13.335092727070208 }
     
  },
  {
    title: 'Main Station (HBF)',
    image: '/images/location-14.svg',
    distance: '3.4 km',
    carTime: '10 min',
    busTime: '15 min',
    position: { lat: 52.52466107894526, 
    lng:  13.3696716550808 }
   
  },
  {
    title: 'Unter den Linden',
    image: '/images/location-15.svg',
    distance: '1.3 km',
    carTime: '5 min',
    busTime: '5 min',
    walkTime: '15 min',
    position: { lat:52.51704110522542, 
    lng:13.389289771249139 }
     
  },
]