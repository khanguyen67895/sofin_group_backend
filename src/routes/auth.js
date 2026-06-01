const express = require('express')
const store = require('../lib/dataStore')
const { comparePassword, hashPassword, signToken } = require('../lib/auth')
const adminAuth = require('../middleware/adminAuth')

const router = express.Router()

// POST /api/admin/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username và password là bắt buộc', data: null })
    }

    const user = store.getAll('users').find((u) => u.username === username)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không đúng', data: null })
    }

    const ok = await comparePassword(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không đúng', data: null })
    }

    const access_token = signToken({ id: user.id, username: user.username, role: user.role })
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        access_token,
        expiresIn: process.env.JWT_EXPIRES || '7d',
        user: { id: user.id, username: user.username, role: user.role },
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/auth/me
router.get('/me', adminAuth, (req, res) => {
  const user = store.getById('users', req.admin.id)
  if (!user) return res.status(404).json({ success: false, message: 'Not found', data: null })
  res.json({
    success: true,
    message: 'OK',
    data: { id: user.id, username: user.username, role: user.role },
  })
})

// POST /api/admin/auth/change-password
router.post('/change-password', adminAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword và newPassword là bắt buộc', data: null })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự', data: null })
    }

    const user = store.getById('users', req.admin.id)
    if (!user) return res.status(404).json({ success: false, message: 'Not found', data: null })

    const ok = await comparePassword(currentPassword, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng', data: null })
    }

    const passwordHash = await hashPassword(newPassword)
    store.update('users', user.id, { passwordHash })
    res.json({ success: true, message: 'Đổi mật khẩu thành công', data: null })
  } catch (err) {
    next(err)
  }
})

module.exports = router
