require('dotenv').config()
const express = require('express')
const cors = require('cors')
const newsRouter = require('./routes/news')
const errorHandler = require('./middleware/errorHandler')

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
      cb(null, allowedOrigins.includes(origin))
    },
    credentials: true,
  }),
)
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.use('/api/news', newsRouter)

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found', data: null })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[sofin-backend] listening on http://localhost:${PORT}`)
})
