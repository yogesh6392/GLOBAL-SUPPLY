import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/database.js";
import { getConfig } from "../config/env.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";

const config = getConfig();
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const organizationName = process.env.BOOTSTRAP_ADMIN_ORGANIZATION?.trim();

if (!email || !password || !organizationName) {
  throw new Error(
    "Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, and BOOTSTRAP_ADMIN_ORGANIZATION before running this command."
  );
}
if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
  throw new Error("The administrator password must be between 12 and 72 characters.");
}

await connectDatabase(config.mongoUri);
let organization;
let user;
try {
  if (await User.exists({ email })) {
    throw new Error("An account with this email already exists; no administrator was created.");
  }

  organization = await Organization.create({ name: organizationName });
  user = await User.create({
    fullName: "Platform Administrator",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    organization: organization._id
  });
  await Organization.updateOne({ _id: organization._id }, { createdBy: user._id });
  console.log(`Administrator account created for ${email}.`);
} catch (error) {
  if (user) {
    await User.deleteOne({ _id: user._id });
  }
  if (organization) {
    await Organization.deleteOne({ _id: organization._id });
  }
  throw error;
} finally {
  await (await import("mongoose")).default.disconnect();
}
