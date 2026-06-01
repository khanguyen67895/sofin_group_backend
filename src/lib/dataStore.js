const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../../data'))

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`)
}

function readAll(collection) {
  const fp = filePath(collection)
  if (!fs.existsSync(fp)) return []
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch {
    return []
  }
}

function writeAll(collection, items) {
  fs.writeFileSync(filePath(collection), JSON.stringify(items, null, 2), 'utf8')
}

function newId() {
  return crypto.randomBytes(8).toString('hex')
}

function now() {
  return new Date().toISOString()
}

module.exports = {
  getAll(collection) {
    return readAll(collection)
  },

  getById(collection, id) {
    return readAll(collection).find((item) => item.id === id) || null
  },

  create(collection, data) {
    const items = readAll(collection)
    const item = { id: newId(), createdAt: now(), updatedAt: now(), ...data }
    items.push(item)
    writeAll(collection, items)
    return item
  },

  update(collection, id, data) {
    const items = readAll(collection)
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return null
    const updated = { ...items[idx], ...data, id, updatedAt: now() }
    items[idx] = updated
    writeAll(collection, items)
    return updated
  },

  remove(collection, id) {
    const items = readAll(collection)
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return false
    items.splice(idx, 1)
    writeAll(collection, items)
    return true
  },

  paginate(collection, page = 1, limit = 10, filter) {
    let items = readAll(collection)
    if (typeof filter === 'function') items = items.filter(filter)
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.max(1, Math.min(page, totalPages))
    const start = (safePage - 1) * limit
    return {
      data: items.slice(start, start + limit),
      meta: { total, page: safePage, limit, totalPages },
    }
  },
}
