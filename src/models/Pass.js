import mongoose from "mongoose";
import crypto from "crypto";

const passSchema = new mongoose.Schema(
  {
    // Human-facing unique ID. Generate it in a util, e.g. HRS-2026-X7K9P2
    passId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: "Registration", required: true },
    passType: { type: mongoose.Schema.Types.ObjectId, ref: "PassType", required: true },
    // Random secret inside the QR code, resolved server-side.
    // Never put passId or user data directly in the QR.
    qrToken: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
    status: { type: String, enum: ["active", "invalid", "reissued"], default: "active" },
    isScanned: { type: Boolean, default: false },
    firstScannedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Pass", passSchema);