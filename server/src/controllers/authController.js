import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import HttpError from "../utils/HttpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const TOKEN_LIFETIME_MS = 8 * 60 * 60 * 1000;
const COOKIE_NAME = "auth_token";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  };
}

function createToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "8h",
    issuer: "supply-chain-platform",
    audience: "supply-chain-platform-users"
  });
}

function presentUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    organization: {
      id: user.organization.id,
      name: user.organization.name
    }
  };
}

export const register = asyncHandler(async (request, response) => {
  const { fullName, email, password, role, organizationName } = request.body;
  if (await User.exists({ email: email.trim().toLowerCase() })) {
    throw new HttpError(409, "An account with this email address already exists.");
  }

  const organization = await Organization.create({ name: organizationName.trim() });
  let user;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    user = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      organization: organization._id
    });
    await Organization.updateOne({ _id: organization._id }, { createdBy: user._id });
  } catch (error) {
    if (user) {
      await User.deleteOne({ _id: user._id });
    }
    await Organization.deleteOne({ _id: organization._id });
    throw error;
  }

  const populatedUser = await User.findById(user._id).populate("organization", "name");
  response.cookie(COOKIE_NAME, createToken(user.id), {
    ...cookieOptions(),
    maxAge: TOKEN_LIFETIME_MS
  });
  response.status(201).json({
    success: true,
    message: "Your account has been created.",
    data: { user: presentUser(populatedUser) }
  });
});

export const login = asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select("+passwordHash")
    .populate("organization", "name");
  const passwordMatches = user?.active ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    throw new HttpError(401, "Email or password is incorrect.");
  }

  response.cookie(COOKIE_NAME, createToken(user.id), {
    ...cookieOptions(),
    maxAge: TOKEN_LIFETIME_MS
  });
  response.status(200).json({
    success: true,
    message: "You are signed in.",
    data: { user: presentUser(user) }
  });
});

export const logout = (_request, response) => {
  response.clearCookie(COOKIE_NAME, cookieOptions());
  response.status(200).json({ success: true, message: "You are signed out." });
};

export const getCurrentUser = asyncHandler(async (request, response) => {
  response.status(200).json({
    success: true,
    data: { user: presentUser(request.user) }
  });
});
