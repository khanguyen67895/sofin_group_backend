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

// Xóa resize hints của CDN (mediacdn.vn, GenK/CafeF,...) để lấy ảnh full-size
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

module.exports = { pickLargestFromSrcset, upgradeImageUrl }
