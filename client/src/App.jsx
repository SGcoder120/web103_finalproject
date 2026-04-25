import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import './styles/restroomCards.css';
import royalFlushLogo from './assets/royal_flush_logo.png';
import MapView from './components/MapView';
import { authApi, mapsApi, reviewsApi } from './api';
import ReviewsPage from './components/ReviewsPage';

function toMiles(meters = 0) {
  return (meters * 0.000621371).toFixed(2);
}

function App() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [user, setUser] = useState(null);
  const [restrooms, setRestrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addressInput, setAddressInput] = useState('');
  const [locationIdByPlaceId, setLocationIdByPlaceId] = useState({});
  const [reviewSummaryByLocation, setReviewSummaryByLocation] = useState({});
  const [ratingsReady, setRatingsReady] = useState(false);
  const syncDebounceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    authApi
      .getSession()
      .then((session) => {
        setUser(session?.success ? session.user : null);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  const resetPlaceData = () => {
    setRestrooms([]);
    setLocationIdByPlaceId({});
    setReviewSummaryByLocation({});
    setRatingsReady(false);
  };

  const getUserLocation = () => {
    setLoading(true);
    setError(null);
    resetPlaceData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          setLoading(false);
        },
        (geoError) => {
          setError('Unable to get your location. Please allow location access.');
          setLoading(false);
          console.error('Geolocation error:', geoError);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
    }
  };

  const handleAddressSearch = async (event) => {
    event.preventDefault();
    const q = addressInput.trim();
    if (!q) {
      setError('Enter an address, city, or ZIP code.');
      return;
    }
    setLoading(true);
    setError(null);
    resetPlaceData();
    try {
      const coords = await mapsApi.geocode(q);
      setLocation(coords);
    } catch (geoErr) {
      setError(geoErr.message || 'Could not find that location.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapPlacesFound = useCallback(async (places) => {
    if (!location) return;

    const mappedPlaces = places
      .filter((place) => place.geometry?.location && place.place_id)
      .map((place) => {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const distanceMeters = window.google.maps.geometry
          ? window.google.maps.geometry.spherical.computeDistanceBetween(
              new window.google.maps.LatLng(location.lat, location.lng),
              new window.google.maps.LatLng(lat, lng)
            )
          : 0;

        return {
          placeId: place.place_id,
          name: place.name || 'Unnamed Bathroom',
          address: place.vicinity || '',
          latitude: lat,
          longitude: lng,
          distanceMiles: toMiles(distanceMeters),
        };
      });

    setRestrooms(mappedPlaces);
    if (mappedPlaces.length === 0) {
      setRatingsReady(true);
      return;
    }
    setRatingsReady(false);

    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(async () => {
      syncDebounceRef.current = null;
      try {
        const synced = await reviewsApi.syncLocations(mappedPlaces);
        const placeToDbId = synced.reduce((acc, row) => {
          acc[row.google_place_id] = row.id;
          return acc;
        }, {});
        setLocationIdByPlaceId(placeToDbId);

        const ids = synced.map((row) => row.id);
        if (ids.length === 0) {
          setRatingsReady(true);
          return;
        }
        const summary = await reviewsApi.getLocationsSummary(ids);
        const summaryById = summary.reduce((acc, row) => {
          acc[row.id] = row;
          return acc;
        }, {});
        setReviewSummaryByLocation(summaryById);
        setRatingsReady(true);
      } catch (apiError) {
        console.warn('Review sync unavailable (map still works):', apiError?.message || apiError);
        setRatingsReady(true);
      }
    }, 400);
  }, [location]);

  const restroomsWithMetadata = useMemo(
    () =>
      restrooms.map((restroom) => {
        const locationId = locationIdByPlaceId[restroom.placeId];
        const summary = locationId ? reviewSummaryByLocation[locationId] : null;
        return {
          ...restroom,
          locationId,
          summary,
        };
      }).sort((a, b) => Number(a.distanceMiles) - Number(b.distanceMiles)),
    [locationIdByPlaceId, restrooms, reviewSummaryByLocation]
  );

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const showAllowAccessButton =
    error === 'Unable to get your location. Please allow location access.';

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="app home-page">
      <header className="app-header">
        <div className="brand">
          <img src={royalFlushLogo} alt="Royal Flush logo" className="brand-logo-image" />
          <div className="brand-copy">
            <h1 className="brand-title">Royal Flush</h1>
            <p className="brand-subtitle">Find nearby restrooms in style</p>
          </div>
        </div>
        <nav className="user-links">
          {user ? (
            <button type="button" onClick={handleLogout} className="details-link">
              Logout
            </button>
          ) : (
            <>
              <a href={authApi.githubLoginUrl}>Log In</a>
              <a href={authApi.githubLoginUrl}>Sign Up</a>
            </>
          )}
        </nav>
      </header>

      <section className="search-panel">
        <div className="location-controls">
          <button
            type="button"
            className="location-btn"
            onClick={getUserLocation}
            disabled={loading}
          >
            Use my location
          </button>
          <form className="address-search" onSubmit={handleAddressSearch}>
            <input
              type="text"
              className="location-input"
              placeholder="Or enter address, city, or ZIP"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              aria-label="Search by address"
              autoComplete="street-address"
            />
            <button type="submit" className="location-search-submit" disabled={loading}>
              Search
            </button>
          </form>
        </div>

        <div>
          <h1 style={{color: 'black', fontSize: '20px', fontWeight: 'bold'}}>MAP VIEW</h1>
          <MapView
            userLocation={location}
            onPlacesFound={handleMapPlacesFound}
            locationIdByPlaceId={locationIdByPlaceId}
            reviewSummaryByLocation={reviewSummaryByLocation}
            isLoggedIn={Boolean(user)}
            onRequireLogin={() => {
              window.location.href = authApi.githubLoginUrl;
            }}
            onLeaveReview={(locationId, openComposer) => {
              navigate(`/review/${locationId}${openComposer ? '?open=1' : ''}`);
            }}
          />
        </div>

        <div className="results-summary">
          {!location
            ? 'Use your location or search for an address to find nearby restrooms.'
            : loading
              ? 'Loading restrooms...'
              : restrooms.length > 0 && !ratingsReady
                ? 'Loading community ratings...'
              : `${restrooms.length} nearby restrooms found`}
        </div>
      </section>

      {error && (
        <div className="error">
          <span>{error}</span>
          {showAllowAccessButton && (
            <button
              type="button"
              onClick={getUserLocation}
              style={{ marginLeft: '0.75rem' }}
            >
              Allow access
            </button>
          )}
        </div>
      )}

      {ratingsReady && (
        <section className="results-grid">
          {restroomsWithMetadata.map((restroom, index) => (
            <article key={restroom.placeId || index} className="result-card">
              <div className="card-topline">
                <span className="card-label">Restroom {index + 1}</span>
                <span className="card-distance">{restroom.distanceMiles} mi away</span>
              </div>
              <h2 className="card-title">{restroom.name || 'Unnamed Bathroom'}</h2>
              <p className="card-address">{restroom.address || 'Address unavailable'}</p>
              <div className="card-meta">
                <span className="card-meta-label">Community Rating</span>
                <span className="card-meta-value">
                  {restroom.summary?.average_rating != null
                    ? `${restroom.summary.average_rating}/5 (${restroom.summary.review_count} reviews)`
                    : 'No Reviews'}
                </span>
              </div>

              <div className="card-footer">
                {restroom.locationId && (
                  <Link to={`/review/${restroom.locationId}`} className="result-details-link">
                    See Reviews
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
        }
      />
      <Route
        path="/review/:locationId"
        element={<ReviewsPage user={user} onUserChange={setUser} />}
      />
    </Routes>
  );
}

export default App;
