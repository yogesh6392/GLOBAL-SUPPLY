import { PUBLIC_REGISTRATION_ROLES } from "../models/roles.js";
import HttpError from "../utils/HttpError.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(request, _response, next) {
  const { fullName, email, password, role, organizationName } = request.body ?? {};
  const errors = [];

  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 100) {
    errors.push("Full name must be between 2 and 100 characters.");
  }
  if (typeof email !== "string" || email.length > 254 || !emailPattern.test(email.trim())) {
    errors.push("Enter a valid email address.");
  }
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    errors.push("Password must be between 8 and 72 characters.");
  }
  if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
    errors.push("Select a valid non-administrator account role.");
  }
  if (
    typeof organizationName !== "string" ||
    organizationName.trim().length < 2 ||
    organizationName.trim().length > 120
  ) {
    errors.push("Organization name must be between 2 and 120 characters.");
  }

  if (errors.length > 0) {
    return next(new HttpError(400, "Please correct the highlighted registration details.", errors));
  }
  next();
}

export function validateLogin(request, _response, next) {
  const { email, password } = request.body ?? {};
  if (
    typeof email !== "string" ||
    !emailPattern.test(email.trim()) ||
    typeof password !== "string" ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return next(new HttpError(400, "Enter a valid email address and password."));
  }
  next();
}
