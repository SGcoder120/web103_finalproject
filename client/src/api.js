const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: isFormData
      ? { ...(options.headers || {}) }
      : {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
    ...options,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = data?.message || 'Request failed'
    throw new Error(message)
  }

  return data
}

export const authApi = {
  getSession: () => request('/auth/login/success'),
  logout: () => request('/auth/logout'),
  githubLoginUrl: `${API_BASE}/auth/github`,
}

export const mapsApi = {
  geocode: (address) =>
    request(`/api/geocode?address=${encodeURIComponent(address)}`),
}

export const reviewsApi = {
  syncLocations: (locations) =>
    request('/reviews/locations/sync', {
      method: 'POST',
      body: JSON.stringify({ locations }),
    }),
  getLocationReviews: (locationId) => request(`/reviews/location/${locationId}`),
  getLocationsSummary: (locationIds) =>
    request(`/reviews/locations/summary?locationIds=${locationIds.join(',')}`),
  getMyReviews: () => request('/reviews/mine'),
  getFavorites: () => request('/reviews/favorites'),
  addFavorite: (locationId) =>
    request(`/reviews/favorites/${locationId}`, {
      method: 'POST',
    }),
  removeFavorite: (locationId) =>
    request(`/reviews/favorites/${locationId}`, {
      method: 'DELETE',
    }),
  createReview: (locationId, payload) =>
    request(`/reviews/location/${locationId}`, {
      method: 'POST',
      body: payload,
    }),
  updateReview: (reviewId, payload) =>
    request(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: payload,
    }),
  deleteReview: (reviewId) =>
    request(`/reviews/${reviewId}`, {
      method: 'DELETE',
    }),
}
