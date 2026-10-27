import mongoose from "mongoose";
import { PUBLIC_REGISTRATION_ROLES } from "./roles.js";

const invitationSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254
  },
  role: {
    type: String,
    enum: PUBLIC_REGISTRATION_ROLES,
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "revoked"],
    default: "pending",
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  acceptedAt: Date
}, { timestamps: true });

invitationSchema.index({ organization: 1, createdAt: -1 });
invitationSchema.index({ email: 1, status: 1, expiresAt: 1 });

export default mongoose.model("Invitation", invitationSchema);
