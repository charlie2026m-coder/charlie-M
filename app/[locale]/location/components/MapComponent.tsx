"use client";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useMemo } from "react";

const defaultCenter = {
  lat: 52.504992498425274, 
  lng: 13.391040308320248  
};

export default function MapComponent({
  width = "100%", 
  height = "400px", 
  center = defaultCenter,
  image = '/images/map-marker.svg',
  markerSize = 30,
}: {
  width?: string, 
  height?: string, 
  center?: {lat: number, lng: number}, 
  image?: string,
  markerSize?:number
}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"], // Синхронизируем с другими компонентами
  });

  const customMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;

    return {  
      url:image,
      scaledSize: new google.maps.Size(markerSize, markerSize),
      anchor: new google.maps.Point(13, 30),
    };
  }, [isLoaded]);


  return (
    <>
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{
            width: width,
            height: height,
            borderRadius: "30px"
          }}
          center={center}
          zoom={16}
          options={{
            mapId: "map",
            zoomControl: false, 
            streetViewControl: false, 
            mapTypeControl: false, 
            fullscreenControl: false,
            gestureHandling: "cooperative",
            disableDefaultUI: true, // Убирает ВСЕ стандартные элементы управления
          }}
        >
          <Marker position={center} icon={customMarkerIcon} />
        </GoogleMap>
      ) : (
        <div style={{width, height}} className="text-white text-center flex items-center justify-center">Loading map...</div>
      )}
    </>
  );
}