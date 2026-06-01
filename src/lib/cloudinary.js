const { v2: cloudinary } = require('cloudinary')

const FOLDER = process.env.CLOUDINARY_FOLDER || 'sofin'

// Cấu hình: ưu tiên CLOUDINARY_URL, hoặc 3 biến rời
if (process.env.CLOUDINARY_URL) {
  // SDK tự đọc CLOUDINARY_URL từ env
  cloudinary.config({ secure: true })
} else if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

const isEnabled = Boolean(
  process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET),
)

// Upload buffer (file từ máy) → trả về secure_url
function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err)
        resolve(result.secure_url)
      },
    )
    stream.end(buffer)
  })
}

// Upload trực tiếp từ URL ngoài → Cloudinary tự tải về
async function uploadFromUrl(url) {
  const result = await cloudinary.uploader.upload(url, {
    folder: FOLDER,
    resource_type: 'image',
  })
  return result.secure_url
}

module.exports = { cloudinary, isEnabled, uploadBuffer, uploadFromUrl, FOLDER }
