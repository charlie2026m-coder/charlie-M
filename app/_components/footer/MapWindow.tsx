"use client";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const defaultCenter = {
  lat: 52.504992498425274, 
  lng: 13.391040308320248  
};
export default function MapWindow({width = "100%", height = "400px", center = defaultCenter}: {width?: string, height?: string, center?: {lat: number, lng: number}}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const brownMarkerIcon = isLoaded ? {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="26" height="30" viewBox="0 0 26 30" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 6 13 17 13 17s13-11 13-17C26 5.8 20.2 0 13 0z" fill="#8B7B70"/>
        <circle cx="13" cy="11" r="4" fill="#ffffff"/>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(26, 30),
    anchor: new google.maps.Point(13, 30),
  } : undefined;



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
            disableDefaultUI: true,
            zoomControl: false, 
            streetViewControl: false, 
            mapTypeControl: false, 
            fullscreenControl: true,
            gestureHandling: "cooperative", 
          }}
        >
          <Marker 
            position={center} 
            icon={brownMarkerIcon}
          />
        </GoogleMap>
      ) : (
        <div style={{width, height}} className="text-white text-center flex items-center justify-center">Loading map...</div>
      )}
    </>
  );
}