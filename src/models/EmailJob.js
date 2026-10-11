import mongoose from "mongoose";

const emailJobSchema = new mongoose.Schema(
  {
    notification: { type: mongoose.Schema.Types.ObjectId, ref: "Notification" },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    // Unique key so the same email is never queued twice
    jobKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["scheduled", "pending", "sent", "failed", "cancelled"],
      default: "pending",
    },
    // Stop retrying after 5 failures
    retryCount: { type: Number, default: 0, max: 5 },
    scheduledFor: { type: Date },
    lastAttemptAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("EmailJob", emailJobSchema);