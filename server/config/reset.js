import './loadEnv.js'
import { pool } from './database.js'
import { seedAllTables } from './seedTables.js'

async function resetDatabase() {
  try {
    console.log('Resetting database tables...')

    await pool.query(`
      DROP TABLE IF EXISTS review_images CASCADE;
      DROP TABLE IF EXISTS favorites CASCADE;
      DROP TABLE IF EXISTS reviews CASCADE;
      DROP TABLE IF EXISTS locations CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `)

    console.log('Existing tables dropped successfully.')

    await seedAllTables()

    console.log('Database reset complete.')
  } catch (error) {
    console.error('Database reset failed:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

resetDatabase()
