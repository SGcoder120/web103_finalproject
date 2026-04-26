import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authApi, reviewsApi } from '../api';
import './ReviewsPage.css';
import royalFlushLogo from '../assets/royal_flush_logo.png';

export default function ReviewsPage({
  user,
  onUserChange,
  favoriteLocationIds,
  onToggleFavorite,
  favoriteLoadingId,
}) {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(searchParams.get('open') === '1');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [form, setForm] = useState({ rating: 0, description: '', imageFiles: [], existingImageUrls: [] });
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reviewsApi.getLocationReviews(locationId);
      setLocation(data.location);
      setReviews(data.reviews);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const userReview = user ? reviews.find((review) => review.user_id === user.id) : null;

  const openCreateModal = () => {
    setEditingReviewId(null);
    setForm({ rating: 0, description: '', imageFiles: [], existingImageUrls: [] });
    setShowModal(true);
  };

  const openEditModal = (review) => {
    setEditingReviewId(review.id);
    setForm({
      rating: Number(review.rating),
      description: review.description || '',
      imageFiles: [],
      existingImageUrls: review.image_urls || [],
    });
    setShowModal(true);
  };

  const ensureSession = async () => {
    if (user) return user;
    const session = await authApi.getSession();
    if (session?.success) {
      onUserChange(session.user);
      return session.user;
    }
    return null;
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const loggedInUser = await ensureSession();
      if (!loggedInUser) {
        window.location.href = authApi.githubLoginUrl;
        return;
      }

      const payload = new FormData();
      payload.append('rating', String(Number(form.rating)));
      payload.append('description', form.description);
      form.imageFiles.forEach((file) => payload.append('images', file));
      if (editingReviewId) {
        payload.append('existingImageUrls', JSON.stringify(form.existingImageUrls));
      }

      if (editingReviewId) {
        await reviewsApi.updateReview(editingReviewId, payload);
      } else {
        await reviewsApi.createReview(locationId, payload);
      }

      setShowModal(false);
      setEditingReviewId(null);
      setForm({ rating: 0, description: '', imageFiles: [], existingImageUrls: [] });
      await loadReviews();
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const removeReview = async (reviewId) => {
    try {
      await reviewsApi.deleteReview(reviewId);
      await loadReviews();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete review');
    }
  };

  const goToGithubAuth = () => {
    window.location.href = authApi.githubLoginUrl;
  };

  useEffect(() => {
    if (!showModal || loading || !user) return;
    if (editingReviewId || !userReview) return;
    const timer = window.setTimeout(() => {
      openEditModal(userReview);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [showModal, loading, user, userReview, editingReviewId]);

  const remainingImageSlots = Math.max(0, 2 - form.existingImageUrls.length);
  const isFavorited = (favoriteLocationIds || []).includes(Number(locationId));

  return (
    <div className="app reviews-page">
      <header className="app-header">
        <div className="brand">
          <img src={royalFlushLogo} alt="Royal Flush logo" className="brand-logo-image" />
          <div className="brand-copy">
            <h1 className="brand-title">Royal Flush Reviews</h1>
            <p className="brand-subtitle">{location?.name || 'Bathroom'}</p>
          </div>
        </div>
        <nav className="user-links">
          <Link to="/reviews" className="details-link">
            My Reviews
          </Link>
          <Link to="/bookmarks" className="details-link">
            🔖 Bookmarks
          </Link>
          <Link to="/" className="details-link">
            Back to map
          </Link>
        </nav>
      </header>

      {loading ? (
        <p className="reviews-loading">Loading reviews...</p>
      ) : (
        <>
          <section className="result-card location-overview-card">
            <h2 className="card-title">{location?.name}</h2>
            <p className="card-address">{location?.address || 'Address unavailable'}</p>
            <p className="location-overview-summary">
              {location?.average_rating != null
                ? `Average ${location.average_rating}/5 from ${location.review_count} reviews`
                : 'No reviews yet'}
            </p>
            <div className="location-overview-actions">
              <button
                type="button"
                onClick={() => onToggleFavorite(Number(locationId), !isFavorited)}
                className={isFavorited ? 'review-action-btn review-action-btn--primary' : 'review-action-btn'}
                disabled={favoriteLoadingId === Number(locationId)}
              >
                🔖{' '}
                {favoriteLoadingId === Number(locationId)
                  ? 'Saving...'
                  : !user
                    ? 'Sign in to bookmark'
                    : isFavorited
                      ? 'Bookmarked'
                      : 'Bookmark restroom'}
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={userReview ? () => openEditModal(userReview) : openCreateModal}
                  className="review-action-btn review-action-btn--primary"
                >
                  {userReview ? 'Edit your review' : 'Leave a review'}
                </button>
              ) : (
                <button type="button" onClick={goToGithubAuth} className="review-action-btn review-action-btn--primary">
                  Login or Signup to leave a review
                </button>
              )}
              <button type="button" onClick={() => navigate('/')} className="review-action-btn">
                Back
              </button>
            </div>
          </section>

          {error && <div className="error">{error}</div>}

          <section className="results-grid">
            {reviews.map((review) => (
              <article key={review.id} className="result-card review-card">
                <div className="review-header">
                  <div className="review-username">
                    <span className="card-label">{review.username}</span>
                  </div>
                  <div className="review-stars-row">
                    <div className="review-stars-readonly" aria-label={`Rating ${Number(review.rating).toFixed(1)} out of 5`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= Math.round(Number(review.rating)) ? 'star is-filled' : 'star'}>
                          ★
                        </span>
                      ))}
                      <span className="review-score">{Number(review.rating).toFixed(1)} / 5</span>
                    </div>
                  </div>
                </div>
                <p className="card-address">Description: {review.description}</p>
                {review.image_urls?.length > 0 && (
                  <div className="review-image-grid">
                    {review.image_urls.map((imageUrl) => (
                      <img key={imageUrl} src={imageUrl} alt="Review upload" className="review-image" />
                    ))}
                  </div>
                )}
                {user?.id === review.user_id && (
                  <div className="review-owner-actions">
                    <button type="button" onClick={() => openEditModal(review)} className="review-action-btn">
                      Edit
                    </button>
                    <button type="button" onClick={() => removeReview(review.id)} className="review-action-btn review-action-btn--danger">
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        </>
      )}

      {showModal && (
        <div className="review-modal-backdrop">
          <div className="review-modal">
            <h3>{editingReviewId ? 'Edit review' : 'Leave a review'}</h3>
            <form onSubmit={submitReview} className="review-form">
              <label htmlFor="rating">Your rating</label>
              <div className="review-stars-input" role="radiogroup" aria-label="Select rating from one to five stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={Number(form.rating) === star}
                    className={star <= Number(form.rating) ? 'star-button is-filled' : 'star-button'}
                    onClick={() => setForm((prev) => ({ ...prev, rating: star }))}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="selected-rating-label">{Number(form.rating) ? `${form.rating} out of 5 stars` : 'Select a rating'}</p>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows="4"
                required
              />
              {editingReviewId && form.existingImageUrls.length > 0 && (
                <div className="existing-images-section">
                  <p className="selected-rating-label">Current images</p>
                  <div className="review-image-grid">
                    {form.existingImageUrls.map((imageUrl) => (
                      <div key={imageUrl} className="editable-image-card">
                        <img src={imageUrl} alt="Current review upload" className="review-image" />
                        <button
                          type="button"
                          className="review-action-btn review-action-btn--danger review-image-remove-btn"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              existingImageUrls: prev.existingImageUrls.filter((url) => url !== imageUrl),
                              imageFiles: prev.imageFiles.slice(0, Math.max(0, 2 - (prev.existingImageUrls.length - 1))),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <label htmlFor="imageFile">Upload image (up to {remainingImageSlots} more)</label>
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files || []).slice(0, remainingImageSlots);
                  setForm((prev) => ({ ...prev, imageFiles: selectedFiles }));
                }}
                disabled={remainingImageSlots === 0}
              />
              {form.imageFiles.length > 0 && (
                <p className="selected-rating-label">
                  Selected {form.imageFiles.length} image{form.imageFiles.length > 1 ? 's' : ''}: {form.imageFiles.map((file) => file.name).join(', ')}
                </p>
              )}
              <div className="review-modal-actions">
                <button type="submit" className="review-action-btn review-action-btn--primary" disabled={submitting || Number(form.rating) < 1}>
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="review-action-btn" disabled={submitting}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
