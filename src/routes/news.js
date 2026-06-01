const express = require('express')
const { scrapeNews } = require('../services/newsScraper')
const { scrapeArticle } = require('../services/articleScraper')
const { parsePositiveInt } = require('../lib/pagination')
const { getCachedDetail } = require('../lib/caching')

const router = express.Router()

const CACHE_TTL = Number(process.env.CACHE_TTL_MS) || 5 * 60 * 1000
const DETAIL_TTL = Number(process.env.DETAIL_CACHE_TTL_MS) || 30 * 60 * 1000
let cache = { items: null, expiresAt: 0 }
const detailCache = new Map()

async function getItems() {
  const now = Date.now()
  if (!cache.items || cache.expiresAt < now) {
    const items = await scrapeNews()
    cache = { items, expiresAt: now + CACHE_TTL }
  }
  return cache.items
}

router.get('/', async (req, res, next) => {
  try {
    const items = await getItems()
    const total = items.length
    const limit = parsePositiveInt(req.query.limit, 9, 100)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const page = Math.min(parsePositiveInt(req.query.page, 1), totalPages)

    const start = (page - 1) * limit
    const pageItems = items.slice(start, start + limit)

    res.json({
      success: true,
      message: 'OK',
      data: pageItems,
      meta: { total, page, limit, totalPages },
    })
  } catch (err) {
    next(err)
  }
})

router.get('/refresh', async (_req, res, next) => {
  try {
    const items = await scrapeNews()
    cache = { items, expiresAt: Date.now() + CACHE_TTL }
    res.json({ success: true, message: 'Cache refreshed', data: { count: items.length } })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const items = await getItems()
    const item = items.find((n) => n.id === req.params.id)
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: 'News not found', data: null })
    }

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
        tags: detail?.tags || [],
        source: detail?.source || '',
      },
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
