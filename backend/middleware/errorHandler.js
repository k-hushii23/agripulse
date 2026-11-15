// 404 handler for unknown API routes
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

// Global error-handling middleware (4 parameters required by Express)
const globalErrorHandler = (err, req, res, next) => {
  console.error("Unhandled Server Error:", err.message);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || "Internal Server Error"
  });
};

module.exports = { notFoundHandler, globalErrorHandler };