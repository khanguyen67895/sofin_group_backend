module.exports = function errorHandler(err, _req, res, _next) {
  const status = err.status || err.response?.status || 500
  console.error(`[error] ${status} ${err.message}`)
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
  })
}
