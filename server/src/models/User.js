import mongoose from "mongoose";
import { USER_ROLES } from "./roles.js";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true
    },
    active: {
      type: Boolean,
      default: true,
      required: true
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    }
  },
  { timestamps: true }
);

userSchema.index({ organization: 1, role: 1 });
userSchema.set("toJSON", {
  transform(_document, result) {
    delete result.passwordHash;
    delete result.__v;
    return result;
  }
});

export default mongoose.model("User", userSchema);
