require('dotenv').config()
const express = require('express')
const cors = require('cors')
const newsRouter = require('./routes/news')
const recruitmentRouter = require('./routes/recruitment')
const cmsRouter = require('./routes/cms')
const authRouter = require('./routes/auth')
const adminNewsRouter = require('./routes/admin/news')
const adminEcosystemRouter = require('./routes/admin/ecosystem')
const adminRecruitmentRouter = require('./routes/admin/recruitment')
const adminUploadRouter = require('./routes/admin/upload')
const adminAuth = require('./middleware/adminAuth')
const errorHandler = require('./middleware/errorHandler')
const seedAdmin = require('./lib/seedAdmin')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = Number(process.env.PORT) || 3001

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true)
      cb(null, allowedOrigins.includes(origin.replace(/\/$/, '')))
    },
    credentials: true,
  }),
)
app.use(express.json())

// Static file serving for uploads
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'))
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// Public routes
app.use('/api/news', newsRouter)
app.use('/api/recruitment', recruitmentRouter)
app.use('/api/cms', cmsRouter)

// Auth (login is public; /me and /change-password are self-guarded)
app.use('/api/admin/auth', authRouter)

// Admin routes — protected by JWT or x-api-key
app.use('/api/admin/upload', adminAuth, adminUploadRouter)
app.use('/api/admin/news', adminAuth, adminNewsRouter)
app.use('/api/admin/ecosystem', adminAuth, adminEcosystemRouter)
app.use('/api/admin/recruitment', adminAuth, adminRecruitmentRouter)

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found', data: null })
})

app.use(errorHandler)

seedAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`[sofin-backend] listening on http://localhost:${PORT}`)
  })
})
