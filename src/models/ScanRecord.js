import mongoose from "mongoose";

// Append-only log of every scan attempt. Never edit or delete.
const scanRecordSchema = new mongoose.Schema(
  {
    pass: { type: mongoose.Schema.Types.ObjectId, ref: "Pass", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    location: { type: String },
    result: {
      type: String,
      enum: ["valid_entry", "already_scanned_allowed", "invalid"],
      required: true,
    },
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition" },
  },
  { timestamps: true }
);

export default mongoose.model("ScanRecord", scanRecordSchema);