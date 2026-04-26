import React, { useState, useEffect, useCallback } from 'react';
import {
  GoogleMap,
  Marker,
  Circle,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';
import bathroomIconUrl from '../assets/toliet_logo.png';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES = ['places', 'geometry'];

const mapContainerStyle = { width: '100%', height: '50vh' };

const defaultCenter = { lat: 40.7128, lng: -73.9352 };

function renderStars(averageRating) {
  const rounded = Math.round(Number(averageRating) || 0);
  return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(0, 5 - rounded);
}

export default function MapView({
  userLocation,
  onPlacesFound,
  visiblePlaceIds,
  locationIdByPlaceId,
  reviewSummaryByLocation,
  favoriteLocationIds,
  onLeaveReview,
  isLoggedIn,
  onRequireLogin,
  onToggleFavorite,
  favoriteLoadingId,
}) {
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [map, setMap] = useState(null);
  const [showNoNearbyMessage, setShowNoNearbyMessage] = useState(false);
  const mapCenter = userLocation || defaultCenter;
  const shouldFilterVisiblePlaces = Array.isArray(visiblePlaceIds);
  const visiblePlaceIdSet = new Set(visiblePlaceIds || []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const bathroomIcon = {
    url: bathroomIconUrl,
    scaledSize: isLoaded ? new window.google.maps.Size(36, 36) : undefined,
  };

  const runNearbySearch = useCallback(() => {
    if (!userLocation || !window.google?.maps?.places) return;

    setSelectedPlace(null);
    setPlaces([]);
    setShowNoNearbyMessage(false);

    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );

    service.nearbySearch(
      {
        location: userLocation,
        radius: 1500,
        keyword: 'public restroom',
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPlaces(results);
          onPlacesFound?.(results);
          setShowNoNearbyMessage(false);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setPlaces([]);
          onPlacesFound?.([]);
          setShowNoNearbyMessage(true);
        } else {
          setPlaces([]);
          onPlacesFound?.([]);
          setShowNoNearbyMessage(false);
        }
      }
    );
  }, [onPlacesFound, userLocation]);

  useEffect(() => {
    if (!isLoaded || !userLocation) return undefined;
    const timer = setTimeout(() => {
      runNearbySearch();
    }, 0);
    return () => clearTimeout(timer);
  }, [isLoaded, runNearbySearch, userLocation]);

  useEffect(() => {
    if (!map || !userLocation || places.length === 0) return;

    const closestPlace = places.reduce((closest, place) => {
      const location = place.geometry?.location;
      if (!location) return closest;

      const latDiff = location.lat() - userLocation.lat;
      const lngDiff = location.lng() - userLocation.lng;
      const distanceScore = latDiff * latDiff + lngDiff * lngDiff;

      if (!closest || distanceScore < closest.distanceScore) {
        return {
          distanceScore,
          lat: location.lat(),
          lng: location.lng(),
        };
      }
      return closest;
    }, null);

    if (!closestPlace) return;

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(userLocation);
    bounds.extend({ lat: closestPlace.lat, lng: closestPlace.lng });
    map.fitBounds(bounds);

    if (map.getZoom() > 17) {
      map.setZoom(17);
    }
  }, [map, places, userLocation]);

  if (loadError) {
    return (
      <div style={{ padding: '1rem', color: '#c00' }}>
        Map failed to load. Check your Google Maps API key and that Places is enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return <div style={{ padding: '1rem' }}>Loading map…</div>;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ padding: '1rem', color: '#c00' }}>
        Set VITE_GOOGLE_MAPS_API_KEY in your environment to show the map.
      </div>
    );
  }

  return (
    <div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={userLocation ? 15 : 12}
        clickableIcons={false}
        onClick={() => setSelectedPlace(null)}
        onLoad={(mapInstance) => setMap(mapInstance)}
        onUnmount={() => setMap(null)}
      >
      {userLocation && (
        <>
          <Marker
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
            }}
          />

          <Circle
            center={userLocation}
            radius={50}
            options={{
              fillColor: '#4285F4',
              fillOpacity: 0.2,
              strokeOpacity: 0,
            }}
          />
        </>
      )}

      {places.map((place) => {
        const loc = place.geometry?.location;
        if (!loc || (shouldFilterVisiblePlaces && !visiblePlaceIdSet.has(place.place_id))) return null;
        return (
          <Marker
            key={place.place_id || `${loc.lat()}-${loc.lng()}`}
            position={{ lat: loc.lat(), lng: loc.lng() }}
            icon={bathroomIcon}
            onClick={() => setSelectedPlace(place)}
          />
        );
      })}

      {selectedPlace?.geometry?.location && (
        <InfoWindow
          position={{
            lat: selectedPlace.geometry.location.lat(),
            lng: selectedPlace.geometry.location.lng(),
          }}
          onCloseClick={() => setSelectedPlace(null)}
        >
          <div style={{ position: 'relative', paddingTop: '8px', minWidth: '180px' }}>
            <button
              type="button"
              onClick={() => setSelectedPlace(null)}
              aria-label="Close restroom details"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                border: 'none',
                background: 'rgba(255, 255, 255, 0.95)',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                color: 'red',
                lineHeight: 1,
                borderRadius: '999px',
                width: '22px',
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              }}
            >
              X
            </button>
            <br/>
            {(() => {
              const placeId = selectedPlace.place_id;
              const locationId = placeId ? locationIdByPlaceId?.[placeId] : null;
              const summary = locationId ? reviewSummaryByLocation?.[locationId] : null;
              const average = summary?.average_rating;
              return average != null ? (
                <p style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 700 }}>
                  {renderStars(average)} ({average}/5)
                </p>
              ) : (
                <p style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 700 }}>No Reviews</p>
              );
            })()}
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>{selectedPlace.name}</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{selectedPlace.vicinity}</p>
            {(() => {
              const placeId = selectedPlace.place_id;
              const locationId = placeId ? locationIdByPlaceId?.[placeId] : null;
              const summary = locationId ? reviewSummaryByLocation?.[locationId] : null;
              const isFavorited = locationId ? favoriteLocationIds?.includes(locationId) : false;
              return (
                <div style={{ marginTop: '10px' }}>
                  {summary?.average_rating != null && (
                    <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#444' }}>
                      {summary.review_count} review{summary.review_count === 1 ? '' : 's'}
                    </p>
                  )}
                  {locationId && (
                    <button
                      type="button"
                      style={{ marginRight: '8px' }}
                      onClick={() => onToggleFavorite?.(locationId, !isFavorited)}
                      disabled={favoriteLoadingId === locationId}
                    >
                      🔖{' '}
                      {favoriteLoadingId === locationId
                        ? 'Saving...'
                        : !isLoggedIn
                          ? 'Sign in to bookmark'
                          : isFavorited
                            ? 'Bookmarked'
                            : 'Bookmark'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!locationId) return;
                      if (isLoggedIn) {
                        onLeaveReview?.(locationId, true);
                      } else {
                        onRequireLogin?.();
                      }
                    }}
                    disabled={!locationId}
                  >
                    {isLoggedIn ? 'Leave a review' : 'Login or Signup to leave a review'}
                  </button>
                </div>
              );
            })()}
          </div>
        </InfoWindow>
      )}
      </GoogleMap>
      {showNoNearbyMessage && (
        <p style={{ margin: '0.75rem 0 0', color: '#444', fontWeight: 600 }}>
          No nearby public toliets
        </p>
      )}
    </div>
  );
}
