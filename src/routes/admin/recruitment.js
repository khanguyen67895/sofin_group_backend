const express = require('express')
const store = require('../../lib/dataStore')
const { parsePositiveInt: parsePage } = require('../../lib/pagination')

const router = express.Router()
const COLLECTION = 'jobs'

const JOB_TYPES = ['full-time', 'part-time', 'remote', 'internship']
const JOB_STATUSES = ['active', 'inactive', 'closed']

// GET /api/admin/recruitment
router.get('/', (req, res) => {
  const page = parsePage(req.query.page, 1)
  const limit = parsePage(req.query.limit, 10, 100)
  const result = store.paginate(COLLECTION, page, limit)
  res.json({ success: true, message: 'OK', ...result })
})

// GET /api/admin/recruitment/:id
router.get('/:id', (req, res) => {
  const item = store.getById(COLLECTION, req.params.id)
  if (!item) return res.status(404).json({ success: false, message: 'Not found', data: null })
  res.json({ success: true, message: 'OK', data: item })
})

// POST /api/admin/recruitment
// Body: { title, department?, location?, type?, description?, requirements?, benefits?, deadline?, status? }
router.post('/', (req, res) => {
  const { title, department, location, type, description, requirements, benefits, deadline, status } = req.body

  if (!title) return res.status(400).json({ success: false, message: 'title is required', data: null })

  if (type && !JOB_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `type must be one of: ${JOB_TYPES.join(', ')}`,
      data: null,
    })
  }

  const item = store.create(COLLECTION, {
    title,
    department: department || '',
    location: location || '',
    type: JOB_TYPES.includes(type) ? type : 'full-time',
    // Chấp nhận cả string (textarea từ CMS) lẫn array
    description: description || '',
    requirements: requirements || '',
    benefits: benefits || '',
    deadline: deadline || null,
    status: JOB_STATUSES.includes(status) ? status : 'active',
  })
  res.status(201).json({ success: true, message: 'Created', data: item })
})

// PUT /api/admin/recruitment/:id
router.put('/:id', (req, res) => {
  if (!store.getById(COLLECTION, req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found', data: null })
  }

  const { type, status } = req.body
  if (type !== undefined && !JOB_TYPES.includes(type)) {
    return res.status(400).json({ success: false, message: `type must be one of: ${JOB_TYPES.join(', ')}`, data: null })
  }
  if (status !== undefined && !JOB_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${JOB_STATUSES.join(', ')}`, data: null })
  }

  const EDITABLE = ['title', 'department', 'location', 'type', 'description', 'requirements', 'benefits', 'deadline', 'status']
  const updates = {}
  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  const updated = store.update(COLLECTION, req.params.id, updates)
  res.json({ success: true, message: 'Updated', data: updated })
})

// DELETE /api/admin/recruitment/:id
router.delete('/:id', (req, res) => {
  if (!store.remove(COLLECTION, req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found', data: null })
  }
  res.json({ success: true, message: 'Deleted', data: null })
})

module.exports = router
