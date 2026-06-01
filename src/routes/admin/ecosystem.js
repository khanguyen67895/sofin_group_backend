const express = require('express')
const store = require('../../lib/dataStore')
const { parsePositiveInt: parsePage } = require('../../lib/pagination')

const router = express.Router()
const COLLECTION = 'ecosystem'

// GET /api/admin/ecosystem
router.get('/', (req, res) => {
  const page = parsePage(req.query.page, 1)
  const limit = parsePage(req.query.limit, 10, 100)
  const result = store.paginate(COLLECTION, page, limit)
  res.json({ success: true, message: 'OK', ...result })
})

// GET /api/admin/ecosystem/:id
router.get('/:id', (req, res) => {
  const item = store.getById(COLLECTION, req.params.id)
  if (!item) return res.status(404).json({ success: false, message: 'Not found', data: null })
  res.json({ success: true, message: 'OK', data: item })
})

// POST /api/admin/ecosystem
// Body: { name, logo?, images?, description?, website?, category?, order?, status? }
router.post('/', (req, res) => {
  const { name, logo, images, description, website, category, order, status } = req.body
  if (!name) return res.status(400).json({ success: false, message: 'name is required', data: null })

  const imgs = Array.isArray(images) ? images.filter(Boolean) : []

  const item = store.create(COLLECTION, {
    name,
    images: imgs,
    logo: logo || imgs[0] || '',
    description: description || '',
    website: website || '',
    category: category || '',
    order: typeof order === 'number' ? order : 0,
    status: status === 'inactive' ? 'inactive' : 'active',
  })
  res.status(201).json({ success: true, message: 'Created', data: item })
})

// PUT /api/admin/ecosystem/:id
router.put('/:id', (req, res) => {
  if (!store.getById(COLLECTION, req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found', data: null })
  }

  const EDITABLE = ['name', 'logo', 'images', 'description', 'website', 'category', 'order', 'status']
  const updates = {}
  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  // Giữ logo đồng bộ = ảnh đầu tiên trong mảng
  if (Array.isArray(updates.images)) {
    updates.images = updates.images.filter(Boolean)
    if (updates.logo === undefined) updates.logo = updates.images[0] || ''
  }

  const updated = store.update(COLLECTION, req.params.id, updates)
  res.json({ success: true, message: 'Updated', data: updated })
})

// DELETE /api/admin/ecosystem/:id
router.delete('/:id', (req, res) => {
  if (!store.remove(COLLECTION, req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found', data: null })
  }
  res.json({ success: true, message: 'Deleted', data: null })
})

module.exports = router
