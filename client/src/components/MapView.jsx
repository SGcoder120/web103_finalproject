import React from 'react';
import { GoogleMap, LoadScript } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function MapView() {
    return (
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={{width: '100%', height: '50vh'}}
          center={{lat: 40.7128, lng: -73.9352}}
          zoom={11}
        >
          {/* Map content goes here later */}
        </GoogleMap>
      </LoadScript>
    );
  }