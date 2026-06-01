async function getCachedDetail(id, url, detailCache, ttl, scrapeArticle) {
  const now = Date.now()
  const cached = detailCache.get(id)
  let detail = cached && cached.expiresAt > now ? cached.data : null

  if (!detail) {
    try {
      detail = await scrapeArticle(url)
      detailCache.set(id, { data: detail, expiresAt: now + ttl })
    } catch {
      detail = null
    }
  }

  return detail
}

module.exports = { getCachedDetail }
