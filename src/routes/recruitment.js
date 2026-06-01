const express = require('express')
const multer = require('multer')
const { sendCVToHR } = require('../services/emailService')

const router = express.Router()

// Store file in memory (buffer), max 5MB, only pdf/doc/docx
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    cb(null, allowed.includes(file.mimetype))
  },
})

// POST /api/recruitment/apply
router.post('/apply', upload.single('cv'), async (req, res, next) => {
  try {
    const { name, email, phone, position, message } = req.body

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: name, email, phone',
        data: null,
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ', data: null })
    }

    await sendCVToHR({ name, email, phone, position, message }, req.file || null)

    res.json({
      success: true,
      message: 'Hồ sơ đã được gửi thành công. Chúng tôi sẽ liên hệ lại sớm!',
      data: null,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
