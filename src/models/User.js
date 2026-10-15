import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      alias: "user_id",
    },
    googleId: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-zA-Z0-9._%+-]+@gmail\.com$/, "Only @gmail.com accounts are allowed"],
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    college: { type: String, trim: true },
    address: {
      line1: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relation: { type: String, trim: true },
    },
    profileImage: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    onboardingComplete: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);