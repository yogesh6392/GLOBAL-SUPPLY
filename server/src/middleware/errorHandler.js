export function notFoundHandler(_request, _response, next) {
  const error = new Error("The requested resource was not found.");
  error.status = 404;
  next(error);
}

export function errorHandler(error, _request, response, _next) {
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({
      success: false,
      message: "Request body must contain valid JSON."
    });
  }

  if (error?.code === 11000) {
    return response.status(409).json({
      success: false,
      message: "An account with this email address already exists."
    });
  }

  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) {
    console.error(error);
  }

  const payload = {
    success: false,
    message: status >= 500 ? "An unexpected server error occurred." : error.message
  };
  if (Array.isArray(error?.details)) {
    payload.details = error.details;
  }

  return response.status(status).json(payload);
}
