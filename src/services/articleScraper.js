const axios = require('axios')
const cheerio = require('cheerio')

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

function pickLargestFromSrcset(srcset) {
  if (!srcset) return ''
  let best = { url: '', width: 0 }
  for (const part of srcset.split(',')) {
    const m = part.trim().match(/(\S+)\s+(\d+)w/)
    if (m) {
      const w = parseInt(m[2], 10)
      if (w > best.width) best = { url: m[1], width: w }
    }
  }
  return best.url
}

function upgradeImageUrl(url) {
  if (!url) return url
  let out = url
  out = out.replace(/\/thumb_w\/\d+\//i, '/')
  out = out.replace(/\/thumb\/\d+x\d+\//i, '/')
  out = out.replace(/\/zoom\/\d+[x_]\d+\//i, '/')
  out = out.replace(/\/resize\/\d+x\d+\//i, '/')
  try {
    const u = new URL(out)
    for (const p of ['w', 'h', 'width', 'height', 'quality', 'resize']) {
      u.searchParams.delete(p)
    }
    out = u.toString()
  } catch { /* non-URL, keep as-is */ }
  return out
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

async function scrapeArticle(url) {
  const { data: html } = await axios.get(url, AXIOS_CFG)
  const $ = cheerio.load(html)
  const origin = new URL(url).origin

  const title =
    cleanText($('h1').first().text()) ||
    $('meta[property="og:title"]').attr('content') ||
    ''

  const sapo =
    cleanText($('h2.knc-sapo, .knc-sapo, .kbwcms-sapo, .sapo').first().text()) ||
    $('meta[property="og:description"]').attr('content') ||
    ''

  const $body = $('.knc-content, [itemprop="articleBody"], .detail-content').first()

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
      const caption = cleanText($(el).closest('figure, .VCSortableInPreviewMode').find('figcaption, .PhotoCMS_Caption').text())
      if (src) images.push({ src, caption })
    })

    contentHtml = $body.html()?.trim() || ''
    contentText = cleanText($body.text())
  }

  const mainImage =
    $('meta[property="og:image"]').attr('content') ||
    (images[0] && images[0].src) ||
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
