import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')

dotenv.config({
  path: envPath,
  // Shell / IDE often pre-defines empty keys; without override, dotenv skips them and logs "injected env (0)".
  override: true,
})
