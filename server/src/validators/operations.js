import mongoose from "mongoose";
import HttpError from "../utils/HttpError.js";

export const isValidId = (value) => mongoose.isValidObjectId(value);

export function assertRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    throw new HttpError(403, "You do not have permission to perform this operation.");
  }
}

export function requireObject(body, fields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "A JSON object is required.");
  }
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null);
  if (missing.length) {
    throw new HttpError(400, `Required fields are missing: ${missing.join(", ")}.`);
  }
}

export function requireText(value, label, max = 160) {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > max) {
    throw new HttpError(400, `${label} must be a non-empty string of at most ${max} characters.`);
  }
}

export function requireOptionalText(value, label, max) {
  if (value !== undefined && value !== null &&
      (typeof value !== "string" || value.length > max)) {
    throw new HttpError(400, `${label} must be a string of at most ${max} characters.`);
  }
}

export function requirePositiveNumber(value, label, { allowZero = false, minimum = 0 } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) ||
      (allowZero ? value < 0 : value <= 0) || value < minimum) {
    throw new HttpError(400, `${label} must be a ${allowZero ? "non-negative" : "positive"} number.`);
  }
}

export function requireValidId(value, label) {
  if (!isValidId(value)) {
    throw new HttpError(400, `${label} must be a valid identifier.`);
  }
}

export function requireDate(value, label, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === "")) return undefined;
  if ((typeof value !== "string" && !(value instanceof Date)) ||
      !Number.isFinite(new Date(value).getTime())) {
    throw new HttpError(400, `${label} must be a valid date.`);
  }
  return new Date(value);
}
