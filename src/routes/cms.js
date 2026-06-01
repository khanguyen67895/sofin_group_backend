const express = require('express')
const store = require('../lib/dataStore')
const { scrapeArticle } = require('../services/articleScraper')
const { parsePositiveInt: parsePage } = require('../lib/pagination')
const { getCachedDetail } = require('../lib/caching')

const router = express.Router()

const DETAIL_TTL = Number(process.env.DETAIL_CACHE_TTL_MS) || 30 * 60 * 1000
const detailCache = new Map()

// ── News ──────────────────────────────────────────────────────────────────────

// GET /api/cms/news
router.get('/news', (req, res) => {
  const page = parsePage(req.query.page, 1)
  const limit = parsePage(req.query.limit, 9, 100)
  const result = store.paginate('cms_news', page, limit, (n) => n.status === 'active')
  res.json({ success: true, message: 'OK', ...result })
})

// GET /api/cms/news/:id
router.get('/news/:id', async (req, res, next) => {
  try {
    const item = store.getById('cms_news', req.params.id)
    if (!item || item.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Not found', data: null })
    }

    // Manual type: trả nội dung đã lưu
    if (item.type === 'manual') {
      return res.json({
        success: true,
        message: 'OK',
        data: { ...item, content: item.contentHtml || '' },
      })
    }

    // Link type: ưu tiên nội dung đã lưu lúc tạo
    if (item.contentHtml) {
      return res.json({
        success: true,
        message: 'OK',
        data: {
          ...item,
          content: item.contentHtml,
          contentText: item.contentText || '',
          paragraphs: item.paragraphs || [],
          images: item.images || [],
          tags: item.tags || [],
          source: item.source || '',
        },
      })
    }

    // Fallback (bản ghi cũ chưa có content): cào lại, có cache
    const detail = await getCachedDetail(item.id, item.url, detailCache, DETAIL_TTL, scrapeArticle)

    res.json({
      success: true,
      message: 'OK',
      data: {
        ...item,
        title: detail?.title || item.title,
        detail: detail?.sapo || item.detail,
        image: detail?.mainImage || item.image,
        content: detail?.contentHtml || '',
        contentText: detail?.contentText || '',
        paragraphs: detail?.paragraphs || [],
        images: detail?.images || [],
        tags: detail?.tags || item.tags || [],
        source: detail?.source || '',
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── Ecosystem ─────────────────────────────────────────────────────────────────

// GET /api/cms/ecosystem
router.get('/ecosystem', (req, res) => {
  const page = parsePage(req.query.page, 1)
  const limit = parsePage(req.query.limit, 20, 100)
  const result = store.paginate(
    'ecosystem',
    page,
    limit,
    (e) => e.status === 'active',
  )
  // Sort by order field ascending
  result.data.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  res.json({ success: true, message: 'OK', ...result })
})

// GET /api/cms/ecosystem/:id
router.get('/ecosystem/:id', (req, res) => {
  const item = store.getById('ecosystem', req.params.id)
  if (!item || item.status !== 'active') {
    return res.status(404).json({ success: false, message: 'Not found', data: null })
  }
  res.json({ success: true, message: 'OK', data: item })
})

// ── Jobs ──────────────────────────────────────────────────────────────────────

// GET /api/cms/jobs
router.get('/jobs', (req, res) => {
  const page = parsePage(req.query.page, 1)
  const limit = parsePage(req.query.limit, 10, 100)
  const result = store.paginate('jobs', page, limit, (j) => j.status === 'active')
  res.json({ success: true, message: 'OK', ...result })
})

// GET /api/cms/jobs/:id
router.get('/jobs/:id', (req, res) => {
  const item = store.getById('jobs', req.params.id)
  if (!item || item.status !== 'active') {
    return res.status(404).json({ success: false, message: 'Not found', data: null })
  }
  res.json({ success: true, message: 'OK', data: item })
})

module.exports = router
