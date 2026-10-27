import HttpError from "../utils/HttpError.js";

export function authorize(...allowedRoles) {
  return function roleGuard(request, _response, next) {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return next(new HttpError(403, "You do not have permission to access this resource."));
    }
    next();
  };
}
