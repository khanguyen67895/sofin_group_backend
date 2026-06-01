const axios = require('axios')
const cheerio = require('cheerio')
const { pickLargestFromSrcset, upgradeImageUrl } = require('../lib/imageUtils')

const AXIOS_CFG = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  },
  timeout: 15000,
}

function cleanText(t) {
  return (t || '').replace(/\s+/g, ' ').trim()
}

function absolutizeImages($, $body, origin) {
  $body.find('img').each((_i, el) => {
    const $img = $(el)
    const picked =
      pickLargestFromSrcset($img.attr('data-srcset') || $img.attr('srcset')) ||
      $img.attr('data-src') ||
      $img.attr('data-original') ||
      $img.attr('src') ||
      ''
    if (!picked) return
    const abs = picked.startsWith('http')
      ? picked
      : picked.startsWith('//')
      ? `https:${picked}`
      : `${origin}${picked.startsWith('/') ? '' : '/'}${picked}`
    $img.attr('src', upgradeImageUrl(abs))
    $img.removeAttr('data-src')
    $img.removeAttr('data-original')
    $img.removeAttr('data-srcset')
    $img.removeAttr('srcset')
    $img.removeAttr('loading')
  })
}

// Các selector phổ biến cho phần thân bài (nhiều site VN)
const BODY_SELECTORS = [
  '#news-bodyhtml',
  '.bodytext',
  '.knc-content',
  '[itemprop="articleBody"]',
  '.detail-content',
  '.article-content',
  '.article-body',
  '.articleBody',
  '.entry-content',
  '.post-content',
  '.content-detail',
  '.news-content',
  '.fck_detail',
  '#main-detail-body',
  '.cms-body',
  '.the-article-body',
  '.singular-content',
]

const SAPO_SELECTORS = [
  'h2.knc-sapo',
  '.knc-sapo',
  '.kbwcms-sapo',
  '.sapo',
  '.article-sapo',
  '.detail-sapo',
  '.post-excerpt',
  '.bodytext-intro',
  '.news-sapo',
]

// Tìm phần thân bài: ưu tiên selector đã biết, nếu không khớp thì
// tự động dò phần tử chứa nhiều thẻ <p> trực tiếp nhất.
function findArticleBody($) {
  for (const sel of BODY_SELECTORS) {
    const el = $(sel).first()
    if (el.length && el.find('p').length >= 2) return el
  }
  let best = null
  let bestCount = 0
  $('div, article, section').each((_i, el) => {
    const $el = $(el)
    const count = $el.children('p').length
    if (count > bestCount) {
      bestCount = count
      best = $el
    }
  })
  return best && bestCount >= 3 ? best : $('[___none___]')
}

async function scrapeArticle(url) {
  const { data: html } = await axios.get(url, AXIOS_CFG)
  const $ = cheerio.load(html)
  const origin = new URL(url).origin

  const title =
    cleanText($('h1').first().text()) ||
    $('meta[property="og:title"]').attr('content') ||
    ''

  const sapo =
    cleanText($(SAPO_SELECTORS.join(', ')).first().text()) ||
    $('meta[property="og:description"]').attr('content') ||
    ''

  const $body = findArticleBody($)

  let contentHtml = ''
  let contentText = ''
  const paragraphs = []
  const images = []

  if ($body.length) {
    $body.find('script, style, .VCSortableInPreviewMode[type="Ads"], .ads, .inread').remove()
    absolutizeImages($, $body, origin)

    $body.find('p').each((_i, el) => {
      const t = cleanText($(el).text())
      if (t) paragraphs.push(t)
    })

    $body.find('img[src]').each((_i, el) => {
      const src = $(el).attr('src')
      if (src && !images.includes(src)) images.push(src)
    })

    contentHtml = $body.html()?.trim() || ''
    contentText = cleanText($body.text())
  }

  const mainImage =
    $('meta[property="og:image"]').attr('content') ||
    images[0] ||
    ''

  const tags = $('meta[property="article:tag"], meta[name="keywords"]')
    .map((_i, el) => $(el).attr('content'))
    .get()
    .flatMap((v) => (v || '').split(','))
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    title,
    sapo,
    mainImage,
    contentHtml,
    contentText,
    paragraphs,
    images,
    tags,
    source: origin,
  }
}

module.exports = { scrapeArticle }
