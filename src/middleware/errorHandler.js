export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "You can upload up to 5 images only.";
    } else {
      message = "Invalid upload request.";
    }
  }

  if (statusCode >= 500) {
    console.error("Unhandled server error:", {
      path: req.originalUrl,
      method: req.method,
      message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
