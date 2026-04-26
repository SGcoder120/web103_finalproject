import { pool } from '../config/database.js'

function parseImageUrls(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
  return [trimmed]
}

export default {
  async syncLocations(req, res) {
    const { locations } = req.body
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: 'locations array is required' })
    }

    try {
      const syncedLocations = []
      for (const location of locations) {
        const { placeId, name, address, latitude, longitude } = location
        if (!placeId || !name || latitude == null || longitude == null) continue

        // Check if location exists or not, if it doesnt create it in our db, else update it
        // Return the array of locations that are near to the user's location
        const result = await pool.query(
          `INSERT INTO locations (google_place_id, name, address, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (google_place_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             address = EXCLUDED.address,
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [placeId, name, address || null, latitude, longitude]
        )
        syncedLocations.push(result.rows[0])
      }
      return res.status(200).json(syncedLocations)
    } catch (error) {
      console.error('Error syncing locations:', error)
      return res.status(500).json({ message: 'Failed to sync locations' })
    }
  },

  async getReviewsByLocation(req, res) {
    const { locationId } = req.params

    try {
      const locationResult = await pool.query(
        `SELECT
          l.*,
          ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
          COUNT(r.id)::int AS review_count
        FROM locations l
        LEFT JOIN reviews r ON r.location_id = l.id
        WHERE l.id = $1
        GROUP BY l.id`,
        [locationId]
      )

      if (locationResult.rows.length === 0) {
        return res.status(404).json({ message: 'Location not found' })
      }

      const reviewsResult = await pool.query(
        `SELECT r.*, u.username, u.avatarurl
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.location_id = $1
         ORDER BY r.created_at DESC`,
        [locationId]
      )

      const normalizedReviews = reviewsResult.rows.map((review) => ({
        ...review,
        image_urls: parseImageUrls(review.image_url),
      }))

      return res.status(200).json({
        location: locationResult.rows[0],
        reviews: normalizedReviews,
      })
    } catch (error) {
      console.error('Error fetching location reviews:', error)
      return res.status(500).json({ message: 'Failed to load reviews' })
    }
  },

  async getLocationsWithReviewSummary(req, res) {
    const { locationIds } = req.query
    if (!locationIds) {
      return res.status(400).json({ message: 'locationIds query param is required' })
    }

    const parsedIds = String(locationIds)
      .split(',')
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)

    if (parsedIds.length === 0) {
      return res.status(200).json([])
    }

    try {
      const result = await pool.query(
        `SELECT
          l.id,
          l.google_place_id,
          ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
          COUNT(r.id)::int AS review_count
         FROM locations l
         LEFT JOIN reviews r ON r.location_id = l.id
         WHERE l.id = ANY($1::int[])
         GROUP BY l.id
         ORDER BY l.id`,
        [parsedIds]
      )

      return res.status(200).json(result.rows)
    } catch (error) {
      console.error('Error fetching review summaries:', error)
      return res.status(500).json({ message: 'Failed to fetch review summaries' })
    }
  },

  async getFavorites(req, res) {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
      const result = await pool.query(
        `SELECT
          f.location_id,
          f.created_at AS favorited_at,
          l.google_place_id,
          l.name,
          l.address,
          l.latitude,
          l.longitude,
          ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
          COUNT(r.id)::int AS review_count
         FROM favorites f
         JOIN locations l ON l.id = f.location_id
         LEFT JOIN reviews r ON r.location_id = l.id
         WHERE f.user_id = $1
         GROUP BY f.location_id, f.created_at, l.id
         ORDER BY f.created_at DESC`,
        [userId]
      )

      return res.status(200).json(result.rows)
    } catch (error) {
      console.error('Error fetching favorites:', error)
      return res.status(500).json({ message: 'Failed to load favorites' })
    }
  },

  async getMyReviews(req, res) {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
      const result = await pool.query(
        `SELECT
          r.*,
          l.name AS location_name,
          l.address AS location_address,
          l.google_place_id,
          ROUND(location_stats.average_rating::numeric, 1) AS location_average_rating,
          location_stats.review_count::int AS location_review_count
         FROM reviews r
         JOIN locations l ON l.id = r.location_id
         LEFT JOIN (
           SELECT
             location_id,
             AVG(rating) AS average_rating,
             COUNT(*) AS review_count
           FROM reviews
           GROUP BY location_id
         ) location_stats ON location_stats.location_id = l.id
         WHERE r.user_id = $1
         ORDER BY r.updated_at DESC, r.created_at DESC`,
        [userId]
      )

      const normalizedReviews = result.rows.map((review) => ({
        ...review,
        image_urls: parseImageUrls(review.image_url),
      }))

      return res.status(200).json(normalizedReviews)
    } catch (error) {
      console.error('Error fetching user reviews:', error)
      return res.status(500).json({ message: 'Failed to load your reviews' })
    }
  },

  async addFavorite(req, res) {
    const userId = req.user?.id
    const locationId = Number(req.params.locationId)
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!Number.isInteger(locationId) || locationId < 1) {
      return res.status(400).json({ message: 'Valid locationId is required' })
    }

    try {
      const locationExists = await pool.query('SELECT id FROM locations WHERE id = $1', [locationId])
      if (!locationExists.rows[0]) {
        return res.status(404).json({ message: 'Location not found' })
      }

      await pool.query(
        `INSERT INTO favorites (user_id, location_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, location_id) DO NOTHING`,
        [userId, locationId]
      )

      return res.status(201).json({ location_id: locationId, is_favorited: true })
    } catch (error) {
      console.error('Error adding favorite:', error)
      return res.status(500).json({ message: 'Failed to save favorite' })
    }
  },

  async removeFavorite(req, res) {
    const userId = req.user?.id
    const locationId = Number(req.params.locationId)
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!Number.isInteger(locationId) || locationId < 1) {
      return res.status(400).json({ message: 'Valid locationId is required' })
    }

    try {
      await pool.query('DELETE FROM favorites WHERE user_id = $1 AND location_id = $2', [userId, locationId])
      return res.status(200).json({ location_id: locationId, is_favorited: false })
    } catch (error) {
      console.error('Error removing favorite:', error)
      return res.status(500).json({ message: 'Failed to remove favorite' })
    }
  },

  async createReview(req, res) {
    const { locationId } = req.params
    const { rating, description } = req.body
    const userId = req.user?.id

    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    if (rating == null || Number(rating) < 0 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Rating must be between 0 and 5' })
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: 'Description is required' })
    }

    try {
      const existingReview = await pool.query(
        'SELECT id FROM reviews WHERE user_id = $1 AND location_id = $2',
        [userId, locationId]
      )
      if (existingReview.rows[0]) {
        return res.status(409).json({ message: 'You have already reviewed this location' })
      }

      const uploadedImageUrls = (req.files || []).map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      )
      const storedImageValue = uploadedImageUrls.length > 0 ? JSON.stringify(uploadedImageUrls) : null

      const result = await pool.query(
        `INSERT INTO reviews (user_id, location_id, rating, description, image_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, locationId, rating, description.trim(), storedImageValue]
      )
      return res.status(201).json(result.rows[0])
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'You have already reviewed this location' })
      }
      console.error('Error creating review:', error)
      return res.status(500).json({ message: 'Failed to create review' })
    }
  },

  async updateReview(req, res) {
    const { reviewId } = req.params
    const { rating, description, existingImageUrls } = req.body
    const userId = req.user?.id

    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    if (rating == null || Number(rating) < 0 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Rating must be between 0 and 5' })
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: 'Description is required' })
    }

    try {
      const ownership = await pool.query('SELECT user_id, image_url FROM reviews WHERE id = $1', [reviewId])
      if (!ownership.rows[0]) return res.status(404).json({ message: 'Review not found' })
      if (ownership.rows[0].user_id !== userId) return res.status(403).json({ message: 'Forbidden' })

      const uploadedImageUrls = (req.files || []).map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      )
      const currentImageUrls = parseImageUrls(ownership.rows[0].image_url)
      const requestedExistingUrls = existingImageUrls == null
        ? currentImageUrls
        : parseImageUrls(existingImageUrls)
      const keptExistingUrls = requestedExistingUrls.filter((url) => currentImageUrls.includes(url))
      const nextImageUrls = [...keptExistingUrls, ...uploadedImageUrls].slice(0, 2)
      const storedImageValue = nextImageUrls.length > 0 ? JSON.stringify(nextImageUrls) : null

      const result = await pool.query(
        `UPDATE reviews
         SET rating = $1, description = $2, image_url = $3, updated_at = CURRENT_TIMESTAMP, is_edited = TRUE
         WHERE id = $4
         RETURNING *`,
        [rating, description.trim(), storedImageValue, reviewId]
      )

      return res.status(200).json(result.rows[0])
    } catch (error) {
      console.error('Error updating review:', error)
      return res.status(500).json({ message: 'Failed to update review' })
    }
  },

  async deleteReview(req, res) {
    const { reviewId } = req.params
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
      const ownership = await pool.query('SELECT user_id FROM reviews WHERE id = $1', [reviewId])
      if (!ownership.rows[0]) return res.status(404).json({ message: 'Review not found' })
      if (ownership.rows[0].user_id !== userId) return res.status(403).json({ message: 'Forbidden' })

      await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId])
      return res.status(200).json({ message: 'Review deleted' })
    } catch (error) {
      console.error('Error deleting review:', error)
      return res.status(500).json({ message: 'Failed to delete review' })
    }
  },
}
