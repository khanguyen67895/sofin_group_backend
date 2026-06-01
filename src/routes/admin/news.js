const express = require('express')
const store = require('../../lib/dataStore')
const { scrapeArticle } = require('../../services/articleScraper')
const { parsePositiveInt: parsePage } = require('../../lib/pagination')

const router = express.Router()
const COLLECTION = 'cms_news'

// GET /api/admin/news
router.get('/', (req, res) => {
  const page = parsePage(req.query.page, 1)
  const limit = parsePage(req.query.limit, 10, 100)
  const result = store.paginate(COLLECTION, page, limit)
  res.json({ success: true, message: 'OK', ...result })
})

// GET /api/admin/news/:id
router.get('/:id', (req, res) => {
  const item = store.getById(COLLECTION, req.params.id)
  if (!item) return res.status(404).json({ success: false, message: 'Not found', data: null })
  res.json({ success: true, message: 'OK', data: item })
})

// POST /api/admin/news
// Body (link):   { type:'link', url, category?, title?, image?, detail? }
// Body (manual): { type:'manual', title, category?, image?, detail?, contentHtml?, tags?, publishedAt? }
router.post('/', async (req, res, next) => {
  try {
    const { type, url, title, image, detail, category, contentHtml, tags, publishedAt } = req.body

    if (!type || !['link', 'manual'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "link" or "manual"', data: null })
    }

    const base = {
      type,
      category: category || 'AI',
      tags: Array.isArray(tags) ? tags : [],
      publishedAt: publishedAt || new Date().toISOString(),
      status: 'active',
    }

    let newsData

    if (type === 'link') {
      if (!url) return res.status(400).json({ success: false, message: 'url is required for type "link"', data: null })

      // Luôn cào toàn bộ nội dung bài để lưu lại (đóng băng dữ liệu)
      let fetched = null
      try { fetched = await scrapeArticle(url) } catch { /* ignore */ }

      newsData = {
        ...base,
        url,
        title: title || fetched?.title || url,
        image: image || fetched?.mainImage || '',
        detail: detail || fetched?.sapo || '',
        contentHtml: fetched?.contentHtml || '',
        contentText: fetched?.contentText || '',
        paragraphs: fetched?.paragraphs || [],
        images: fetched?.images || [],
        source: fetched?.source || '',
        tags: Array.isArray(tags) && tags.length ? tags : fetched?.tags || [],
      }
    } else {
      if (!title) return res.status(400).json({ success: false, message: 'title is required', data: null })
      newsData = {
        ...base,
        title,
        image: image || '',
        detail: detail || '',
        contentHtml: contentHtml || '',
      }
    }

    const item = store.create(COLLECTION, newsData)
    res.status(201).json({ success: true, message: 'Created', data: item })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/news/:id
router.put('/:id', async (req, res, next) => {
  try {
    const current = store.getById(COLLECTION, req.params.id)
    if (!current) {
      return res.status(404).json({ success: false, message: 'Not found', data: null })
    }

    const EDITABLE = ['title', 'image', 'detail', 'category', 'contentHtml', 'tags', 'publishedAt', 'url', 'status']
    const updates = {}
    for (const key of EDITABLE) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    // Nếu là bài link và URL thay đổi → cào lại toàn bộ nội dung mới
    if (current.type === 'link' && updates.url && updates.url !== current.url) {
      try {
        const fetched = await scrapeArticle(updates.url)
        if (fetched) {
          updates.title = req.body.title || fetched.title || updates.url
          updates.image = req.body.image || fetched.mainImage || ''
          updates.detail = req.body.detail || fetched.sapo || ''
          updates.contentHtml = fetched.contentHtml || ''
          updates.contentText = fetched.contentText || ''
          updates.paragraphs = fetched.paragraphs || []
          updates.images = fetched.images || []
          updates.source = fetched.source || ''
        }
      } catch { /* giữ nguyên nếu cào lỗi */ }
    }

    const updated = store.update(COLLECTION, req.params.id, updates)
    res.json({ success: true, message: 'Updated', data: updated })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/news/:id
router.delete('/:id', (req, res) => {
  if (!store.remove(COLLECTION, req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found', data: null })
  }
  res.json({ success: true, message: 'Deleted', data: null })
})

module.exports = router
