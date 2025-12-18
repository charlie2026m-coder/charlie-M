"use client";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useMemo } from "react";

const defaultCenter = {
  lat: 52.504992498425274, 
  lng: 13.391040308320248  
};

export default function MapWindow({
  width = "100%", 
  height = "400px", 
  center = defaultCenter,
  isFullscreen = true,
  image = '/images/map-marker.svg'
}: {width?: string, height?: string, center?: {lat: number, lng: number}, isFullscreen?: boolean, image?: string}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  console.log('Map loaded, rendering Marker at:', center);

  const customMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;

    return {  
      url: image,
      scaledSize: new google.maps.Size(39, 45),
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
            fullscreenControl: isFullscreen,
            gestureHandling: "cooperative", 
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