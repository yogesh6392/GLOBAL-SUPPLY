import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import Invitation from "../models/Invitation.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import { PUBLIC_REGISTRATION_ROLES } from "../models/roles.js";
import { getConfig } from "../config/env.js";
import HttpError from "../utils/HttpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidId } from "../validators/operations.js";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MANAGER_ROLES = ["admin", "manufacturer"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const organizationId = (request) => request.user.organization._id ?? request.user.organization.id;
const presentUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt
});

function requireTeamManager(request) {
  if (!MANAGER_ROLES.includes(request.user.role)) {
    throw new HttpError(403, "Only organization administrators and manufacturers can manage team members.");
  }
}

export const listMembers = asyncHandler(async (request, response) => {
  requireTeamManager(request);
  const users = await User.find({ organization: organizationId(request) })
    .select("fullName email role active createdAt")
    .sort({ createdAt: 1 })
    .lean();
  response.json({ success: true, data: { members: users.map((user) => ({
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt
  })) } });
});

export const updateMember = asyncHandler(async (request, response) => {
  requireTeamManager(request);
  const { id } = request.params;
  if (!isValidId(id)) throw new HttpError(400, "Member ID must be a valid identifier.");
  const { role, active } = request.body ?? {};
  if (role === undefined && active === undefined) {
    throw new HttpError(400, "Provide a role or active status to update.");
  }
  if (role !== undefined && !PUBLIC_REGISTRATION_ROLES.includes(role)) {
    throw new HttpError(400, "Choose a valid non-administrator member role.");
  }
  if (active !== undefined && typeof active !== "boolean") {
    throw new HttpError(400, "Member active status must be true or false.");
  }
  if (String(id) === String(request.user._id)) {
    throw new HttpError(400, "You cannot change your own role or access.");
  }

  const member = await User.findOne({ _id: id, organization: organizationId(request) });
  if (!member || member.role === "admin") {
    throw new HttpError(404, "Organization member was not found.");
  }
  const nextRole = role ?? member.role;
  const nextActive = active ?? member.active;
  if (member.active && MANAGER_ROLES.includes(member.role) &&
      (!nextActive || !MANAGER_ROLES.includes(nextRole))) {
    const managerCount = await User.countDocuments({
      organization: organizationId(request),
      active: { $ne: false },
      role: { $in: MANAGER_ROLES }
    });
    if (managerCount <= 1) {
      throw new HttpError(409, "An organization must have at least one active administrator or manufacturer.");
    }
  }

  member.role = nextRole;
  member.active = nextActive;
  await member.save();
  response.json({ success: true, message: "Team member updated.", data: { member: presentUser(member) } });
});

export const listInvitations = asyncHandler(async (request, response) => {
  requireTeamManager(request);
  const invitations = await Invitation.find({
    organization: organizationId(request),
    status: "pending",
    expiresAt: { $gt: new Date() }
  }).select("email role status expiresAt createdAt").sort({ createdAt: -1 }).lean();
  response.json({ success: true, data: { invitations } });
});

export const createInvitation = asyncHandler(async (request, response) => {
  requireTeamManager(request);
  const { email, role } = request.body ?? {};
  if (typeof email !== "string" || email.trim().length > 254 || !emailPattern.test(email.trim())) {
    throw new HttpError(400, "Enter a valid invitation email address.");
  }
  if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
    throw new HttpError(400, "Choose a valid non-administrator member role.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new HttpError(409, "An account with this email address already exists.");
  }
  const organization = organizationId(request);
  if (await Invitation.exists({
    organization,
    email: normalizedEmail,
    status: "pending",
    expiresAt: { $gt: new Date() }
  })) {
    throw new HttpError(409, "An active invitation already exists for this email address.");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
  const invitation = await Invitation.create({
    organization,
    email: normalizedEmail,
    role,
    tokenHash: hashToken(token),
    expiresAt
  });
  const organizationRecord = await Organization.findById(organization).select("name");
  if (!organizationRecord) throw new HttpError(404, "Organization was not found.");

  response.status(201).json({
    success: true,
    message: "Invitation created. Share the link with the invited teammate.",
    data: {
      invitation: {
        id: String(invitation._id),
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        organizationName: organizationRecord.name,
        invitationUrl: `${getConfig().clientOrigin}/invite/${token}`
      }
    }
  });
});

export const revokeInvitation = asyncHandler(async (request, response) => {
  requireTeamManager(request);
  const { id } = request.params;
  if (!isValidId(id)) throw new HttpError(400, "Invitation ID must be a valid identifier.");
  const invitation = await Invitation.findOneAndUpdate(
    { _id: id, organization: organizationId(request), status: "pending" },
    { $set: { status: "revoked" } },
    { new: true }
  );
  if (!invitation) throw new HttpError(404, "Pending invitation was not found.");
  response.json({ success: true, message: "Invitation revoked.", data: { invitation: { id: String(invitation._id) } } });
});

export const getInvitationDetails = asyncHandler(async (request, response) => {
  const invitation = await Invitation.findOne({
    tokenHash: hashToken(request.params.token),
    status: "pending",
    expiresAt: { $gt: new Date() }
  }).populate("organization", "name");
  if (!invitation) throw new HttpError(404, "This invitation is invalid, expired, or has already been used.");
  response.json({
    success: true,
    data: {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization.name,
        expiresAt: invitation.expiresAt
      }
    }
  });
});

export const acceptInvitation = asyncHandler(async (request, response) => {
  const { fullName, password } = request.body ?? {};
  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 100) {
    throw new HttpError(400, "Full name must be between 2 and 100 characters.");
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new HttpError(400, "Password must be between 8 and 72 characters.");
  }
  const invitation = await Invitation.findOne({
    tokenHash: hashToken(request.params.token),
    status: "pending",
    expiresAt: { $gt: new Date() }
  });
  if (!invitation) throw new HttpError(404, "This invitation is invalid, expired, or has already been used.");
  if (await User.exists({ email: invitation.email })) {
    throw new HttpError(409, "An account with this email address already exists.");
  }

  let user;
  try {
    user = await User.create({
      fullName: fullName.trim(),
      email: invitation.email,
      passwordHash: await bcrypt.hash(password, 12),
      role: invitation.role,
      organization: invitation.organization
    });
    const claimed = await Invitation.findOneAndUpdate(
      {
        _id: invitation._id,
        tokenHash: hashToken(request.params.token),
        status: "pending",
        expiresAt: { $gt: new Date() }
      },
      { $set: { status: "accepted", acceptedAt: new Date() } },
      { new: true }
    );
    if (!claimed) {
      await User.deleteOne({ _id: user._id });
      throw new HttpError(409, "This invitation has already been used or expired.");
    }
  } catch (error) {
    if (user && error?.code !== 11000) await User.deleteOne({ _id: user._id });
    if (error?.code === 11000) throw new HttpError(409, "An account with this email address already exists.");
    throw error;
  }

  response.status(201).json({
    success: true,
    message: "Invitation accepted. You can now sign in.",
    data: { user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } }
  });
});
