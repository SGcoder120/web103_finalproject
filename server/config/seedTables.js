import './loadEnv.js'
import { pool } from './database.js'
import { fileURLToPath } from 'url'

const seedUsersTable = async () => {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id serial PRIMARY KEY,
            githubid int NOT NULL,
            username varchar(200) NOT NULL,
            avatarurl varchar(500),
            accesstoken varchar(500) NOT NULL
        );
    `)
    console.log('Users table created successfully.')
  } catch (error) {
    console.log('Error seeding users table:', error)
    throw error
  }
}

const seedLocationsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        google_place_id VARCHAR(255) UNIQUE,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        latitude NUMERIC(9, 6),
        longitude NUMERIC(9, 6),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('Locations table created successfully.')
  } catch (error) {
    console.log('Error seeding locations table:', error)
    throw error
  }
}

const seedReviewsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
        description TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_edited BOOLEAN NOT NULL DEFAULT FALSE
      );
    `)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_location_unique_idx
      ON reviews (user_id, location_id);
    `)
    console.log('Reviews table created successfully.')
  } catch (error) {
    console.log('Error seeding reviews table:', error)
    throw error
  }
}

const seedReviewImagesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_images (
        id SERIAL PRIMARY KEY,
        review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('Review images table created successfully.')
  } catch (error) {
    console.log('Error seeding review_images table:', error)
    throw error
  }
}

const seedFavoritesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_location_unique_idx
      ON favorites (user_id, location_id);
    `)
    console.log('Favorites table created successfully.')
  } catch (error) {
    console.log('Error seeding favorites table:', error)
    throw error
  }
}

export const seedAllTables = async () => {
  await seedUsersTable()
  await seedLocationsTable()
  await seedReviewsTable()
  await seedReviewImagesTable()
  await seedFavoritesTable()
  console.log('All tables seeded in correct order.')
}

const currentFilePath = fileURLToPath(import.meta.url)

if (process.argv[1] === currentFilePath) {
  seedAllTables().catch((error) => {
    console.error('Database seeding failed:', error)
    process.exit(1)
  })
}
