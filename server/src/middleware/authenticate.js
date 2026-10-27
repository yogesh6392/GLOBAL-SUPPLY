import jwt from "jsonwebtoken";
import User from "../models/User.js";
import HttpError from "../utils/HttpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (request, _response, next) => {
  const authorization = request.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const token = request.cookies?.auth_token ?? bearerToken;
  if (!token) {
    throw new HttpError(401, "Please sign in to continue.");
  }

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "supply-chain-platform",
      audience: "supply-chain-platform-users"
    });
  } catch {
    throw new HttpError(401, "Your session is invalid or has expired. Please sign in again.");
  }

  const user = await User.findById(claims.sub).populate("organization", "name");
  if (!user || !user.active) {
    throw new HttpError(401, "Your account could not be found. Please sign in again.");
  }

  request.user = user;
  next();
});
