import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.resolve(__dirname, '..', 'uploads')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const safeExt = ext || '.jpg'
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `review-${unique}${safeExt}`)
  },
})

const fileFilter = (_req, file, cb) => {
  if (file.mimetype?.startsWith('image/')) {
    cb(null, true)
    return
  }
  cb(new Error('Only image uploads are allowed'))
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

export default upload
