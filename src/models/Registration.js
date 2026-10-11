import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true },
    participationType: { type: String, enum: ["solo", "team"], required: true },
    // Only set for team entries
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    status: {
      type: String,
      enum: ["pending_payment", "confirmed", "cancelled"],
      default: "pending_payment",
    },
    // 12-hour payment window deadline
    paymentWindowExpiresAt: { type: Date, required: true },
    currentRound: { type: mongoose.Schema.Types.ObjectId, ref: "Round" },
    isEliminated: { type: Boolean, default: false },
    eliminatedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One registration per user per competition
registrationSchema.index({ user: 1, competition: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);