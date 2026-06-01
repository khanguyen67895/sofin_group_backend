const axios = require('axios')
const cheerio = require('cheerio')
const crypto = require('crypto')
const { pickLargestFromSrcset, upgradeImageUrl } = require('../lib/imageUtils')

const SOURCE_URL = process.env.SCRAPE_SOURCE || 'https://genk.vn/ai.chn'
const TARGET_COUNT = Number(process.env.SCRAPE_TARGET) || 100
const MAX_PAGES = Number(process.env.SCRAPE_MAX_PAGES) || 10

const MONTH_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

function formatDateVi(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return formatDateVi(new Date())
  return `${d.getDate()} ${MONTH_VI[d.getMonth()]}, ${d.getFullYear()}`
}

function deriveCategory(sourceUrl, text) {
  const haystack = `${sourceUrl} ${text || ''}`.toLowerCase()
  if (haystack.includes('/ai') || haystack.includes('ai') && haystack.includes('genk')) return 'AI'
  if (haystack.includes('cong-nghe') || haystack.includes('công nghệ')) return 'Công nghệ'
  if (haystack.includes('kinh-doanh') || haystack.includes('kinh doanh')) return 'Kinh doanh'
  if (haystack.includes('startup')) return 'Startup'
  return 'AI'
}

function hashId(input) {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 12)
}

function pickBestImage($el) {
  const img = $el.find('img').first()
  if (!img.length) return ''
  const candidate =
    pickLargestFromSrcset(img.attr('data-srcset') || img.attr('srcset')) ||
    img.attr('data-src') ||
    img.attr('data-original') ||
    img.attr('src') ||
    ''
  return upgradeImageUrl(candidate)
}

function originOf(url) {
  try { return new URL(url).origin } catch { return '' }
}

function toAbsolute(href, origin) {
  if (!href) return ''
  if (href.startsWith('http')) return href
  if (href.startsWith('//')) return `https:${href}`
  return `${origin}${href.startsWith('/') ? '' : '/'}${href}`
}

async function fetchPage(url) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
    timeout: 15000,
  })
  return html
}

function parseGenK(html, items, seen, origin) {
  const $ = cheerio.load(html)

  $('.knswli').each((_idx, el) => {
    const $el = $(el)

    const linkEl = $el.find('a[title]').first()
    const title = (linkEl.attr('title') || linkEl.text()).trim()
    const href = linkEl.attr('href')
    if (!title || !href) return

    const absUrl = toAbsolute(href, origin)
    if (seen.has(absUrl)) return

    const image = pickBestImage($el)
    if (!image) return

    const detail = $el.find('.knswli-sapo').first().text().trim()
    const categoryText = $el.find('.afnews-type, .knswli-meta a').first().text().trim()

    seen.add(absUrl)
    items.push({
      id: hashId(absUrl),
      image,
      category: deriveCategory(SOURCE_URL, categoryText),
      date: formatDateVi(new Date()),
      title,
      detail: detail || title,
      url: absUrl,
    })
  })
}

function buildPageUrl(base, page) {
  if (page === 1) return base
  return base.replace(/\.chn$/, `/trang-${page}.chn`)
}

async function scrapeNews() {
  const items = []
  const seen = new Set()
  const base = SOURCE_URL.replace(/\/$/, '')
  const origin = originOf(base)

  for (let page = 1; page <= MAX_PAGES && items.length < TARGET_COUNT; page++) {
    const pageUrl = buildPageUrl(base, page)
    try {
      const html = await fetchPage(pageUrl)
      const before = items.length
      parseGenK(html, items, seen, origin)
      if (items.length === before) break
    } catch {
      break
    }
  }

  return items.slice(0, TARGET_COUNT)
}

module.exports = { scrapeNews }
