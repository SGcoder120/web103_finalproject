import express from 'express'
import reviewsController from '../controllers/reviewsController.js'
import upload from '../config/upload.js'

const router = express.Router()

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
  next()
}

router.post('/locations/sync', reviewsController.syncLocations)
router.get('/locations/summary', reviewsController.getLocationsWithReviewSummary)
router.get('/mine', requireAuth, reviewsController.getMyReviews)
router.get('/favorites', requireAuth, reviewsController.getFavorites)
router.post('/favorites/:locationId', requireAuth, reviewsController.addFavorite)
router.delete('/favorites/:locationId', requireAuth, reviewsController.removeFavorite)
router.get('/location/:locationId', reviewsController.getReviewsByLocation)
router.post('/location/:locationId', requireAuth, upload.array('images', 2), reviewsController.createReview)
router.put('/:reviewId', requireAuth, upload.array('images', 2), reviewsController.updateReview)
router.delete('/:reviewId', requireAuth, reviewsController.deleteReview)

export default router
