import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import './styles/restroomCards.css';
import royalFlushLogo from './assets/royal_flush_logo.png';
import MapView from './components/MapView';
import { authApi, mapsApi, reviewsApi } from './api';
import ReviewsPage from './components/ReviewsPage';
import BookmarksPage from './components/BookmarksPage';
import MyReviewsPage from './components/MyReviewsPage';

function toMiles(meters = 0) {
  return (meters * 0.000621371).toFixed(2);
}

function getRankingScore(summary) {
  if (!summary?.review_count || summary.average_rating == null) return null;
  return Number(summary.average_rating) * 100 + Number(summary.review_count);
}

function BookmarkLabel({ children }) {
  return (
    <>
      <span className="bookmark-icon" aria-hidden="true">🔖</span>
      <span>{children}</span>
    </>
  );
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
  const [favoriteLocationIds, setFavoriteLocationIds] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);
  const [ratingsReady, setRatingsReady] = useState(false);
  const [filters, setFilters] = useState({
    searchText: '',
    maxDistance: 'all',
    minRating: 'all',
  });
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

  const loadFavorites = useCallback(async () => {
    try {
      const data = await reviewsApi.getFavorites();
      setFavorites(data);
      setFavoriteLocationIds(data.map((favorite) => favorite.location_id));
    } catch (favoriteError) {
      console.warn('Favorites unavailable:', favoriteError?.message || favoriteError);
      setFavorites([]);
      setFavoriteLocationIds([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const timer = window.setTimeout(() => {
      loadFavorites();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFavorites, user]);

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

  const filteredRestroomsWithMetadata = useMemo(() => {
    return restroomsWithMetadata.filter((restroom) => {
      const matchesSearch =
        !filters.searchText ||
        `${restroom.name || ''} ${restroom.address || ''}`
          .toLowerCase()
          .includes(filters.searchText.toLowerCase());

      const matchesDistance =
        filters.maxDistance === 'all' ||
        Number(restroom.distanceMiles) <= Number(filters.maxDistance);

      const matchesRating =
        filters.minRating === 'all' ||
        (restroom.summary?.average_rating != null &&
          Number(restroom.summary.average_rating) >= Number(filters.minRating));

      return matchesSearch && matchesDistance && matchesRating;
    });
  }, [filters, restroomsWithMetadata]);

  const rankedRestrooms = useMemo(() => {
    return filteredRestroomsWithMetadata
      .filter((restroom) => restroom.summary?.average_rating != null && restroom.summary?.review_count > 0)
      .map((restroom) => ({
        ...restroom,
        rankingScore: getRankingScore(restroom.summary),
      }))
      .sort((a, b) => {
        if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
        if (Number(b.summary.review_count) !== Number(a.summary.review_count)) {
          return Number(b.summary.review_count) - Number(a.summary.review_count);
        }
        return Number(b.summary.average_rating) - Number(a.summary.average_rating);
      })
      .map((restroom, index) => ({
        ...restroom,
        rank: index + 1,
      }));
  }, [filteredRestroomsWithMetadata]);

  const topRankedRestrooms = useMemo(
    () => rankedRestrooms.slice(0, 3),
    [rankedRestrooms]
  );

  const lowestRankedRestroom = useMemo(
    () =>
      rankedRestrooms.length > 0
        ? [...rankedRestrooms].sort((a, b) => {
            if (Number(a.summary.average_rating) !== Number(b.summary.average_rating)) {
              return Number(a.summary.average_rating) - Number(b.summary.average_rating);
            }
            return Number(b.summary.review_count) - Number(a.summary.review_count);
          })[0]
        : null,
    [rankedRestrooms]
  );

  const toggleFavorite = useCallback(async (locationId, shouldFavorite) => {
    if (!locationId) return;
    if (!user) {
      window.location.href = authApi.githubLoginUrl;
      return;
    }

    setFavoriteLoadingId(locationId);
    try {
      if (shouldFavorite) {
        await reviewsApi.addFavorite(locationId);
      } else {
        await reviewsApi.removeFavorite(locationId);
      }
      await loadFavorites();
    } catch (favoriteError) {
      setError(favoriteError.message || 'Unable to update favorites');
    } finally {
      setFavoriteLoadingId(null);
    }
  }, [loadFavorites, user]);

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setFavorites([]);
    setFavoriteLocationIds([]);
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
            <>
              <Link to="/bookmarks" className="details-link">
                <BookmarkLabel>Bookmarks</BookmarkLabel>
              </Link>
              <Link to="/reviews" className="details-link">
                My Reviews
              </Link>
              <button type="button" onClick={handleLogout} className="details-link">
                Logout
              </button>
            </>
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

        <div className="preference-filters">
          <div className="preference-filter-header">
            <div>
              <p className="ranking-eyebrow">Bathroom preferences</p>
              <h2 className="preference-filter-title">Filter by what matters to you</h2>
            </div>
            <button
              type="button"
              className="preference-reset-btn"
              onClick={() =>
                setFilters({
                  searchText: '',
                  maxDistance: 'all',
                  minRating: 'all',
                })
              }
            >
              Reset filters
            </button>
          </div>

          <div className="preference-filter-grid">
            <label className="preference-filter-field">
              <span>Name or location</span>
              <input
                type="text"
                value={filters.searchText}
                onChange={(event) => setFilters((prev) => ({ ...prev, searchText: event.target.value }))}
                placeholder="Search by name, street, or area"
              />
            </label>

            <label className="preference-filter-field">
              <span>Distance</span>
              <select
                value={filters.maxDistance}
                onChange={(event) => setFilters((prev) => ({ ...prev, maxDistance: event.target.value }))}
              >
                <option value="all">Any distance</option>
                <option value="0.5">Within 0.5 miles</option>
                <option value="1">Within 1 mile</option>
                <option value="2">Within 2 miles</option>
              </select>
            </label>

            <label className="preference-filter-field">
              <span>Minimum rating</span>
              <select
                value={filters.minRating}
                onChange={(event) => setFilters((prev) => ({ ...prev, minRating: event.target.value }))}
              >
                <option value="all">Any rating</option>
                <option value="4.5">4.5 and up</option>
                <option value="4">4.0 and up</option>
                <option value="3">3.0 and up</option>
              </select>
            </label>
          </div>
        </div>

        <div>
          <h1 style={{color: 'black', fontSize: '20px', fontWeight: 'bold'}}>MAP VIEW</h1>
          <MapView
            userLocation={location}
            onPlacesFound={handleMapPlacesFound}
            visiblePlaceIds={filteredRestroomsWithMetadata.map((restroom) => restroom.placeId)}
            locationIdByPlaceId={locationIdByPlaceId}
            reviewSummaryByLocation={reviewSummaryByLocation}
            favoriteLocationIds={favoriteLocationIds}
            isLoggedIn={Boolean(user)}
            onRequireLogin={() => {
              window.location.href = authApi.githubLoginUrl;
            }}
            onLeaveReview={(locationId, openComposer) => {
              navigate(`/review/${locationId}${openComposer ? '?open=1' : ''}`);
            }}
            onToggleFavorite={toggleFavorite}
            favoriteLoadingId={favoriteLoadingId}
          />
        </div>

        <div className="results-summary">
          {!location
            ? 'Use your location or search for an address to find nearby restrooms.'
            : loading
              ? 'Loading restrooms...'
              : restrooms.length > 0 && !ratingsReady
                ? 'Loading community ratings...'
              : `${filteredRestroomsWithMetadata.length} bathrooms match your filters`}
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
        <>
          {rankedRestrooms.length > 0 && (
            <section className="ranking-panel">
              <div className="ranking-panel-header">
                <div>
                  <p className="ranking-eyebrow">Restroom rankings</p>
                </div>
                <p className="ranking-note">
                  Ranked from real reviews, with more-reviewed restrooms breaking ties.
                </p>
              </div>

              <div className="ranking-highlights">
                {topRankedRestrooms[0] && (
                  <article className="ranking-highlight-card ranking-highlight-card--best">
                    <span className="ranking-highlight-label">Best nearby</span>
                    <h3>{topRankedRestrooms[0].name}</h3>
                    <p>{topRankedRestrooms[0].address || 'Address unavailable'}</p>
                    <strong>
                      #{topRankedRestrooms[0].rank} ranked • {topRankedRestrooms[0].summary.average_rating}/5
                    </strong>
                  </article>
                )}

                {lowestRankedRestroom && (
                  <article className="ranking-highlight-card ranking-highlight-card--worst">
                    <span className="ranking-highlight-label">Needs work</span>
                    <h3>{lowestRankedRestroom.name}</h3>
                    <p>{lowestRankedRestroom.address || 'Address unavailable'}</p>
                    <strong>
                      {lowestRankedRestroom.summary.average_rating}/5 from {lowestRankedRestroom.summary.review_count} review{lowestRankedRestroom.summary.review_count === 1 ? '' : 's'}
                    </strong>
                  </article>
                )}
              </div>

              <div className="ranking-list">
                {topRankedRestrooms.map((restroom) => (
                  <article key={restroom.locationId} className="ranking-item">
                    <div className="ranking-position">#{restroom.rank}</div>
                    <div className="ranking-copy">
                      <p className="ranking-item-name">{restroom.name}</p>
                      <p className="ranking-item-meta">
                        {restroom.summary.average_rating}/5 • {restroom.summary.review_count} review{restroom.summary.review_count === 1 ? '' : 's'} • {restroom.distanceMiles} mi away
                      </p>
                    </div>
                    {restroom.locationId && (
                      <Link to={`/review/${restroom.locationId}`} className="saved-restroom-link">
                        View
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="results-grid">
            {filteredRestroomsWithMetadata.map((restroom, index) => {
              const isFavorited = restroom.locationId ? favoriteLocationIds.includes(restroom.locationId) : false;
              const ranking = restroom.locationId
                ? rankedRestrooms.find((rankedRestroom) => rankedRestroom.locationId === restroom.locationId)
                : null;
              const isWorst = lowestRankedRestroom?.locationId === restroom.locationId;

              return (
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
                  {ranking && (
                    <div className="ranking-badge-row">
                      <span className="ranking-badge">Rank #{ranking.rank}</span>
                      {ranking.rank === 1 && <span className="ranking-badge ranking-badge--best">Top rated</span>}
                      {isWorst && <span className="ranking-badge ranking-badge--worst">Needs work</span>}
                    </div>
                  )}

                  <div className="card-footer">
                    {restroom.locationId && (
                      <button
                        type="button"
                        className={isFavorited ? 'bookmark-btn bookmark-btn--saved' : 'bookmark-btn'}
                        onClick={() => toggleFavorite(restroom.locationId, !isFavorited)}
                        disabled={favoriteLoadingId === restroom.locationId}
                      >
                        <BookmarkLabel>
                          {favoriteLoadingId === restroom.locationId
                            ? 'Saving...'
                            : !user
                              ? 'Sign in to bookmark'
                              : isFavorited
                                ? 'Bookmarked'
                                : 'Bookmark'}
                        </BookmarkLabel>
                      </button>
                    )}
                    {restroom.locationId && (
                      <Link to={`/review/${restroom.locationId}`} className="result-details-link">
                        See Reviews
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
          {filteredRestroomsWithMetadata.length === 0 && (
            <section className="saved-restrooms-panel">
              <div className="saved-restrooms-empty">
                No bathrooms match these preferences yet. Try widening the distance or lowering the rating filter.
              </div>
            </section>
          )}
        </>
      )}
    </div>
        }
      />
      <Route
        path="/review/:locationId"
        element={
          <ReviewsPage
            user={user}
            onUserChange={setUser}
            favoriteLocationIds={favoriteLocationIds}
            onToggleFavorite={toggleFavorite}
            favoriteLoadingId={favoriteLoadingId}
          />
        }
      />
      <Route
        path="/bookmarks"
        element={
          <BookmarksPage
            user={user}
            favorites={favorites}
            favoriteLoadingId={favoriteLoadingId}
            onToggleFavorite={toggleFavorite}
          />
        }
      />
      <Route
        path="/reviews"
        element={<MyReviewsPage user={user} onUserChange={setUser} />}
      />
    </Routes>
  );
}

export default App;
