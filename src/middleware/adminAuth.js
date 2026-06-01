const { verifyToken } = require('../lib/auth')

module.exports = function adminAuth(req, res, next) {
  // 1. JWT Bearer token
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.admin = verifyToken(authHeader.slice(7))
      return next()
    } catch {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn', data: null })
    }
  }

  // 2. Fallback: static API key (x-api-key header)
  const key = process.env.ADMIN_API_KEY
  if (key) {
    const provided = req.headers['x-api-key'] || req.query.apiKey
    if (provided === key) return next()
  }

  res.status(401).json({ success: false, message: 'Unauthorized', data: null })
}
