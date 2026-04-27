import './config/loadEnv.js'
import express from 'express';
import cors from 'cors';
import passport from 'passport'
import session from 'express-session'
import path from 'path'
import { fileURLToPath } from 'url'
import { GitHub } from './config/auth.js'
import authRoutes from './routes/auth.js'
import reviewsRoutes from './routes/reviewsRoutes.js'
import { seedAllTables } from './config/seedTables.js'

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors({
  origin: ['http://localhost:5173', 'https://web103-finalproject-royalflush-1.onrender.com'],
  methods: 'GET,POST,PUT,DELETE,PATCH',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Express session middleware
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}))

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//Paasport to use GitHub strategy
passport.use(GitHub);
passport.serializeUser((user, done) => {
  done(null, user)
})
passport.deserializeUser((user, done) => {
  done(null, user)
})

// Routes
app.use('/auth', authRoutes)
app.use('/reviews', reviewsRoutes)

app.get('/api/geocode', async (req, res) => {
  const address = String(req.query.address || '').trim()
  if (!address) {
    return res.status(400).json({ message: 'address query parameter is required' })
  }
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return res.status(503).json({
      message: 'Server is missing GOOGLE_MAPS_API_KEY (used for address search).',
    })
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
    const googleRes = await fetch(url)
    const data = await googleRes.json()
    if (data.status === 'ZERO_RESULTS') {
      return res.status(404).json({ message: 'No results for that search.' })
    }
    if (data.status !== 'OK' || !data.results?.[0]) {
      return res.status(400).json({
        message: data.error_message || `Geocoding failed (${data.status || 'unknown'}).`,
      })
    }
    const { lat, lng } = data.results[0].geometry.location
    return res.json({ lat, lng })
  } catch (err) {
    console.error('Geocode proxy error:', err)
    return res.status(500).json({ message: 'Geocoding request failed.' })
  }
})

seedAllTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database tables:', error)
    process.exit(1)
  })
