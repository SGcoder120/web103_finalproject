import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import royalFlushLogo from '../assets/royal_flush_logo.png';
import { authApi, reviewsApi } from '../api';
import './ReviewsPage.css';

function renderStars(rating) {
  const rounded = Math.round(Number(rating) || 0);
  return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(0, 5 - rounded);
}

export default function MyReviewsPage({ user, onUserChange }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadMyReviews = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await reviewsApi.getMyReviews();
        if (isMounted) setReviews(data);
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Unable to load your reviews');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMyReviews();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const session = await authApi.getSession();
      if (session?.success) {
        onUserChange(session.user);
        return;
      }
    } catch {
      // Ignore and redirect below.
    }

    window.location.href = authApi.githubLoginUrl;
  };

  if (!user) {
    return (
      <div className="app reviews-page">
        <header className="app-header">
          <div className="brand">
            <img src={royalFlushLogo} alt="Royal Flush logo" className="brand-logo-image" />
            <div className="brand-copy">
              <h1 className="brand-title">My Reviews</h1>
              <p className="brand-subtitle">Sign in to track your restroom feedback</p>
            </div>
          </div>
          <nav className="user-links">
            <Link to="/bookmarks" className="details-link">
              Bookmarks
            </Link>
            <Link to="/" className="details-link">
              Back to map
            </Link>
          </nav>
        </header>

        <section className="saved-restrooms-panel">
          <div className="saved-restrooms-empty">
            <p style={{ margin: '0 0 12px' }}>
              Sign in to see the restroom reviews you have written so far.
            </p>
            <button type="button" onClick={handleLogin} className="review-action-btn review-action-btn--primary">
              Log in to view reviews
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app reviews-page">
      <header className="app-header">
        <div className="brand">
          <img src={royalFlushLogo} alt="Royal Flush logo" className="brand-logo-image" />
          <div className="brand-copy">
            <h1 className="brand-title">My Reviews</h1>
            <p className="brand-subtitle">Every restroom you have reviewed so far</p>
          </div>
        </div>
        <nav className="user-links">
          <Link to="/bookmarks" className="details-link">
            Bookmarks
          </Link>
          <Link to="/" className="details-link">
            Back to map
          </Link>
        </nav>
      </header>

      {loading ? (
        <p className="reviews-loading">Loading your reviews...</p>
      ) : (
        <>
          {error && <div className="error">{error}</div>}

          {reviews.length === 0 ? (
            <section className="saved-restrooms-panel">
              <div className="saved-restrooms-empty">
                You have not reviewed any restrooms yet. Leave a review from any restroom page and it will appear here.
              </div>
            </section>
          ) : (
            <section className="results-grid">
              {reviews.map((review) => (
                <article key={review.id} className="result-card review-card my-review-card">
                  <div className="review-header">
                    <div className="review-stars-row">
                      <div className="review-stars-readonly" aria-label={`Rating ${Number(review.rating).toFixed(1)} out of 5`}>
                        <span>{renderStars(review.rating)}</span>
                        <span className="review-score">{Number(review.rating).toFixed(1)} / 5</span>
                      </div>
                    </div>
                  </div>

                  <h2 className="card-title">{review.location_name}</h2>
                  <p className="card-address">{review.location_address || 'Address unavailable'}</p>
                  <p className="card-address">Your notes: {review.description}</p>
                  <p className="card-address">
                    Community score: {review.location_average_rating || review.rating}/5 from {review.location_review_count || 1} review{Number(review.location_review_count || 1) === 1 ? '' : 's'}
                  </p>

                  {review.image_urls?.length > 0 && (
                    <div className="review-image-grid">
                      {review.image_urls.map((imageUrl) => (
                        <img key={imageUrl} src={imageUrl} alt="Your review upload" className="review-image" />
                      ))}
                    </div>
                  )}

                  <div className="card-footer">
                    <Link to={`/review/${review.location_id}`} className="result-details-link">
                      View restroom page
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
