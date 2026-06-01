const store = require('./dataStore')
const { hashPassword } = require('./auth')

async function seedAdmin() {
  const users = store.getAll('users')
  if (users.some((u) => u.role === 'admin')) return

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'Admin@123'

  const passwordHash = await hashPassword(password)
  store.create('users', { username, passwordHash, role: 'admin' })

  console.log(`[sofin-backend] Admin account created — username: "${username}"`)
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[sofin-backend] WARNING: using default password "Admin@123" — set ADMIN_PASSWORD in .env')
  }
}

module.exports = seedAdmin
