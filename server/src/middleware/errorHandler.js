export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

// Error responses are sanitized in production: internal error text
// (driver messages, stack-derived text) can expose infrastructure
// details, so 5xx answers become a generic "Server error" outside
// development. The real error is ALWAYS logged server-side. Errors an
// handler deliberately marked `expose` (or carrying a 4xx status, e.g.
// multer's upload limits and body-parser syntax errors) keep their
// user-facing message in every environment.
export function errorHandler(err, req, res, next) {
  console.error(err);
  let status = err.status || err.statusCode
    || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Server error";
  if (err.name === "MulterError") {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE"
      ? "Image is too large. Maximum size is 5 MB."
      : "The uploaded file could not be accepted.";
  }
  const expose = err.expose === true || status < 500 || process.env.NODE_ENV !== "production";
  if (!expose) message = "Server error";
  res.status(status).json({ message });
}
