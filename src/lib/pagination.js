function parsePositiveInt(value, fallback, max) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return max ? Math.min(n, max) : n
}

module.exports = { parsePositiveInt }
