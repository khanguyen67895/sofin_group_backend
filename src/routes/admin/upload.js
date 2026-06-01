const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const axios = require('axios')
const cloud = require('../../lib/cloudinary')

const router = express.Router()

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads'))
if (!cloud.isEnabled && !fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
}

function randomName(ext) {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
}

// Lưu file trong RAM rồi đẩy lên Cloudinary (hoặc ghi xuống đĩa khi chưa cấu hình)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter(_req, file, cb) {
    cb(null, ALLOWED_MIME.includes(file.mimetype))
  },
})

function publicUrl(req, filename) {
  const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`
  return `${base}/uploads/${filename}`
}

// Lưu 1 file (buffer) → trả về URL
async function storeFile(req, file) {
  if (cloud.isEnabled) {
    return cloud.uploadBuffer(file.buffer)
  }
  // Fallback local: ghi buffer xuống đĩa
  const ext = path.extname(file.originalname).toLowerCase() || EXT_MAP[file.mimetype] || '.jpg'
  const filename = randomName(ext)
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer)
  return publicUrl(req, filename)
}

// Lưu ảnh từ URL ngoài → trả về URL
async function storeFromUrl(req, url) {
  if (cloud.isEnabled) {
    return cloud.uploadFromUrl(url)
  }
  // Fallback local: tải về rồi ghi xuống đĩa
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
  const contentType = (response.headers['content-type'] || 'image/jpeg').split(';')[0].trim()
  let ext = ''
  try { ext = path.extname(new URL(url).pathname).toLowerCase() } catch { /* ignore */ }
  if (!ext || ext.length > 5) ext = EXT_MAP[contentType] || '.jpg'
  const filename = randomName(ext)
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(response.data))
  return publicUrl(req, filename)
}

// POST /api/admin/upload — 1 ảnh (field: file)
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file', data: null })
    }
    const url = await storeFile(req, req.file)
    res.json({ success: true, message: 'OK', data: { url } })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/upload/multiple
// Chấp nhận file upload (field: files) VÀ/HOẶC URL (field: urls — JSON array hoặc string)
router.post('/multiple', upload.array('files', 20), async (req, res, next) => {
  try {
    const results = []

    // File từ máy
    for (const file of req.files || []) {
      try {
        const url = await storeFile(req, file)
        results.push({ url, originalName: file.originalname, size: file.size, source: 'file' })
      } catch (err) {
        results.push({ url: null, originalName: file.originalname, source: 'file', error: err.message })
      }
    }

    // URL ngoài
    let urls = []
    if (req.body.urls) {
      try {
        const parsed = typeof req.body.urls === 'string' ? JSON.parse(req.body.urls) : req.body.urls
        urls = Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        urls = [req.body.urls]
      }
    }

    for (const url of urls) {
      if (!url || typeof url !== 'string') continue
      try {
        const stored = await storeFromUrl(req, url)
        results.push({ url: stored, source: 'url', originalUrl: url })
      } catch (err) {
        results.push({ url: null, originalUrl: url, source: 'url', error: `Tải thất bại: ${err.message}` })
      }
    }

    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có file hoặc URL nào được gửi lên', data: null })
    }

    res.json({ success: true, message: 'OK', data: results })
  } catch (err) {
    next(err)
  }
})

module.exports = router
