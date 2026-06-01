const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) console.warn('[sofin-backend] WARNING: JWT_SECRET not set — using insecure default')
  return s || 'insecure-default-change-me'
}

module.exports = {
  hashPassword(plain) {
    return bcrypt.hash(plain, 12)
  },
  comparePassword(plain, hash) {
    return bcrypt.compare(plain, hash)
  },
  signToken(payload) {
    return jwt.sign(payload, getSecret(), { expiresIn: process.env.JWT_EXPIRES || '7d' })
  },
  verifyToken(token) {
    return jwt.verify(token, getSecret())
  },
}
