import { useState, useEffect } from 'react';
import './App.css';
import { locationOptions, getSampleRestroomsForLocation } from './data';

function App() {
  const [location, setLocation] = useState(null);
  const [restrooms, setRestrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('current');

  useEffect(() => {
    if (selectedLocation === 'current') {
      getUserLocation();
    } else {
      const sampleData = getSampleRestroomsForLocation(selectedLocation);
      const selected = locationOptions.find((item) => item.id === selectedLocation);
      setLocation(selected ? { lat: selected.lat, lng: selected.lng } : null);
      setRestrooms(sampleData);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  const getUserLocation = () => {
    setLoading(true);
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          setRestrooms([
            {
              name: 'Local Public Plaza',
              street: '202 Neighborhood Ave',
              accessible: true,
              unisex: true,
            },
            {
              name: 'City Center Comfort',
              street: '15 Main St',
              accessible: false,
              unisex: false,
            },
            {
              name: 'Corner Coffee Restroom',
              street: '48 Maple Blvd',
              accessible: true,
              unisex: true,
            },
          ]);
          setLoading(false);
        },
        (error) => {
          setError('Unable to get your location. Please allow location access.');
          setLoading(false);
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
    }
  };

  const handleLocationChange = (event) => {
    setSelectedLocation(event.target.value);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">🧻</div>
          <div>
            <h1>Royal Flush</h1>
            <p>Find nearby restrooms</p>
          </div>
        </div>
        <nav className="user-links">
          <a href="#signin">Sign In</a>
          <a href="#signup">Sign Up</a>
        </nav>
      </header>

      <section className="search-panel">
        <form className="search-bar" onSubmit={(event) => event.preventDefault()}>
          <span className="search-icon">📍</span>
          <select value={selectedLocation} onChange={handleLocationChange} className="location-select" aria-label="Choose location">
            {locationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </form>

        <div className="results-summary">
          {loading ? 'Loading restrooms...' : `${restrooms.length} nearby restrooms found`}
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="results-grid">
        {restrooms.map((restroom, index) => (
          <article key={index} className="result-card">
            <div className="card-top">
              <div>
                <span className="card-label">Restroom {index + 1}</span>
                <h2>{restroom.name || 'Unnamed Bathroom'}</h2>
              </div>
              <button className="bookmark-btn" aria-label="Bookmark restroom">★</button>
            </div>

            <p className="card-address">{restroom.street || restroom.city || 'Address unavailable'}</p>

            <div className="card-footer">
              <a href="#details" className="details-link">Details...</a>
              <div className="card-tags">
                <span>{restroom.accessible ? 'Accessible' : 'Not accessible'}</span>
                <span>{restroom.unisex ? 'Unisex' : 'Gendered'}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export default App;
