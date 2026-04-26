import { Link } from 'react-router-dom';
import royalFlushLogo from '../assets/royal_flush_logo.png';
import { authApi } from '../api';

function BookmarkLabel({ children }) {
  return (
    <>
      <span className="bookmark-icon" aria-hidden="true">🔖</span>
      <span>{children}</span>
    </>
  );
}

export default function BookmarksPage({
  user,
  favorites,
  favoriteLoadingId,
  onToggleFavorite,
}) {
  if (!user) {
    return (
      <div className="app home-page">
        <header className="app-header">
          <div className="brand">
            <img src={royalFlushLogo} alt="Royal Flush logo" className="brand-logo-image" />
            <div className="brand-copy">
              <h1 className="brand-title">Bookmarks</h1>
              <p className="brand-subtitle">Sign in to save your go-to restrooms</p>
            </div>
          </div>
          <nav className="user-links">
            <Link to="/reviews" className="details-link">
              My Reviews
            </Link>
            <Link to="/" className="details-link">
              Back to map
            </Link>
          </nav>
        </header>

        <section className="saved-restrooms-panel">
          <div className="saved-restrooms-empty">
            <p style={{ margin: '0 0 12px' }}>
              Your bookmarked restrooms live here once you are signed in.
            </p>
            <a href={authApi.githubLoginUrl} className="saved-restroom-link">
              Log in to bookmark
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app home-page">
      <header className="app-header">
        <div className="brand">
          <img src={royalFlushLogo} alt="Royal Flush logo" className="brand-logo-image" />
          <div className="brand-copy">
            <h1 className="brand-title">Bookmarks</h1>
            <p className="brand-subtitle">Your saved restrooms in one place</p>
          </div>
        </div>
        <nav className="user-links">
          <Link to="/reviews" className="details-link">
            My Reviews
          </Link>
          <Link to="/" className="details-link">
            Back to map
          </Link>
        </nav>
      </header>

      <section className="saved-restrooms-panel">
        <div className="saved-restrooms-header">
          <div>
            <p className="saved-restrooms-eyebrow">Bookmarks</p>
            <h2 className="saved-restrooms-title">Your bookmarked restrooms</h2>
          </div>
          <span className="saved-restrooms-count">{favorites.length} saved</span>
        </div>
        {favorites.length > 0 ? (
          <div className="saved-restrooms-list">
            {favorites.map((favorite) => (
              <article key={favorite.location_id} className="saved-restroom-chip">
                <div>
                  <p className="saved-restroom-name">{favorite.name}</p>
                  <p className="saved-restroom-address">
                    {favorite.address || 'Address unavailable'}
                  </p>
                </div>
                <div className="saved-restroom-actions">
                  <Link to={`/review/${favorite.location_id}`} className="saved-restroom-link">
                    Open
                  </Link>
                  <button
                    type="button"
                    className="bookmark-btn bookmark-btn--saved"
                    onClick={() => onToggleFavorite(favorite.location_id, false)}
                    disabled={favoriteLoadingId === favorite.location_id}
                  >
                    <BookmarkLabel>
                      {favoriteLoadingId === favorite.location_id ? 'Saving...' : 'Saved'}
                    </BookmarkLabel>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="saved-restrooms-empty">
            Bookmark a restroom from the map or results list and it will show up here for quick access.
          </div>
        )}
      </section>
    </div>
  );
}
